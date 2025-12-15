// src/components/SalesScreen.jsx
import { useState, useEffect } from 'react'
import { Box, Button, SimpleGrid, Text, HStack, Heading, useToast, Spinner, Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalFooter, useDisclosure, VStack, Input, Select } from '@chakra-ui/react'
import { collection, getDocs, addDoc, serverTimestamp, doc, updateDoc, increment, query, orderBy } from 'firebase/firestore'
import { db } from '../firebase'
import { logAction } from '../utils/logger'

// 👇 PDF Imports
import { jsPDF } from "jspdf" 
import autoTable from "jspdf-autotable"

export default function SalesScreen({ onBack }) {
  const [products, setProducts] = useState([])
  const [customers, setCustomers] = useState([]) // 👥 Store Customers here
  const [cart, setCart] = useState([])
  const [loading, setLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // Customer Selection State
  const [selectedCustomerId, setSelectedCustomerId] = useState('') 
  const [customerName, setCustomerName] = useState('Walk-in Customer') // Default
  
  const { isOpen, onOpen, onClose } = useDisclosure()
  const [lastSale, setLastSale] = useState(null)
  
  const toast = useToast()

  // 1. FETCH DATA (Products & Customers)
  useEffect(() => {
    const fetchData = async () => {
      try {
        // A. Fetch Inventory
        const prodSnap = await getDocs(collection(db, "inventory"))
        const prodList = []
        prodSnap.forEach((doc) => prodList.push({ id: doc.id, ...doc.data() })) // This already grabs everything ✅
        setProducts(prodList)

        // B. Fetch Customers (Alphabetical)
        const q = query(collection(db, "customers"), orderBy("name"))
        const custSnap = await getDocs(q)
        constcustList = []
        custSnap.forEach((doc) => custList.push({ id: doc.id, ...doc.data() }))
        setCustomers(custList)

      } catch (error) {
        toast({ title: "Error loading data", status: "error" })
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  // Handle Customer Selection
  const handleCustomerSelect = (e) => {
    const id = e.target.value
    setSelectedCustomerId(id)
    if (id) {
      const cust = customers.find(c => c.id === id)
      setCustomerName(cust.name)
    } else {
      setCustomerName('Walk-in Customer')
    }
  }

  const addToCart = (product) => {
    setCart([...cart, product])
  }

  const totalAmount = cart.reduce((sum, item) => sum + (item.price || 0), 0)

  // 2. CHECKOUT (Now updates Customer Stats!)
  const handleCheckout = async () => {
    if (cart.length === 0) return

    setIsSubmitting(true)
    try {
      // A. Save Sale (UPDATED to include Cost & Profit 💰)
      const saleRef = await addDoc(collection(db, "sales"), {
        items: cart.map(item => ({
          name: item.name,
          price: item.price,
          cost: item.averageUnitCost || 0 // 👈 CAPTURING THE COST!
        })),
        totalAmount: totalAmount,
        totalCost: cart.reduce((sum, item) => sum + (item.averageUnitCost || 0), 0), // 👈 Total Cost of Sale
        itemCount: cart.length,
        customer: customerName,
        customerId: selectedCustomerId || null,
        date: serverTimestamp(),
      })

      // B. Log the Action
      await logAction('Staff', 'New Sale', `Sold ${cart.length} items to ${customerName}`)

      // C. Update Stock
      for (const item of cart) {
        const productRef = doc(db, 'inventory', item.id)
        await updateDoc(productRef, { currentStock: increment(-1) })
      }

      // D. Update Customer Stats (The CRM Magic ✨)
      if (selectedCustomerId) {
        const customerRef = doc(db, 'customers', selectedCustomerId)
        await updateDoc(customerRef, { 
          totalSpent: increment(totalAmount) 
        })
      }

      // E. Set Data for Receipt
      setLastSale({
        id: saleRef.id.substring(0, 6).toUpperCase(),
        items: cart,
        total: totalAmount,
        customer: customerName,
        date: new Date().toLocaleDateString()
      })

      setCart([]) 
      setSelectedCustomerId('')
      setCustomerName('Walk-in Customer') 
      onOpen() 

    } catch (error) {
      console.error("Error:", error)
      toast({ title: "Error processing sale", status: "error" })
    } finally {
      setIsSubmitting(false)
    }
  }

  // 3. WHATSAPP
  const sendWhatsApp = () => {
    if (!lastSale) return
    const itemList = lastSale.items.map(i => `• ${i.name}`).join('\n')
    const message = `*INVOICE #${lastSale.id}* 📄\n` +
                    `*Customer:* ${lastSale.customer}\n\n` +
                    `*Items:*\n${itemList}\n\n` +
                    `*Total: TZS ${lastSale.total.toLocaleString()}*\n\n` +
                    `Thank you! - Nyamoya`
    const url = `https://wa.me/?text=${encodeURIComponent(message)}`
    window.open(url, '_blank')
  }

  // 4. PDF GENERATOR
  const generatePDF = () => {
    if (!lastSale) return
    try {
      const doc = new jsPDF()
      doc.setFontSize(22)
      doc.setTextColor(40, 40, 40)
      doc.text("NYAMOYA ENTERPRISES", 14, 20)
      doc.setFontSize(12)
      doc.text("Quality Peanut Butter", 14, 28)
      doc.text("Phone: +255 123 456 789", 14, 34)

      doc.setFontSize(16)
      doc.text("INVOICE", 140, 20)
      doc.setFontSize(10)
      doc.text(`Invoice #: ${lastSale.id || '---'}`, 140, 30)
      doc.text(`Date: ${lastSale.date || 'N/A'}`, 140, 36)
      doc.text(`Bill To: ${lastSale.customer || 'Customer'}`, 140, 42)

      const tableColumn = ["Item Description", "Price (TZS)"]
      const tableRows = []
      lastSale.items.forEach(item => {
        const price = item.price !== undefined ? item.price : 0
        const name = item.name || "Unknown Item"
        tableRows.push([name, price.toLocaleString()])
      })

      autoTable(doc, {
        startY: 50,
        head: [tableColumn],
        body: tableRows,
        theme: 'grid',
        headStyles: { fillColor: [0, 128, 128] } 
      })

      const safeTotal = lastSale.total !== undefined ? lastSale.total : 0
      const finalY = doc.lastAutoTable.finalY + 10
      doc.setFontSize(14)
      doc.setFont(undefined, 'bold')
      doc.text(`TOTAL AMOUNT: TZS ${safeTotal.toLocaleString()}`, 14, finalY)

      doc.save(`Invoice_${lastSale.id || 'New'}.pdf`)
      toast({ title: "Invoice Downloaded ✅", status: "success" })
    } catch (error) {
      console.error("PDF Error:", error)
      toast({ title: "PDF Failed", status: "error" })
    }
  }

  if (loading) return <Box p={10} textAlign="center"><Spinner size="xl" /></Box>

  return (
    <Box p={4} maxW="600px" mx="auto">
      <HStack justifyContent="space-between" mb={6}>
        <Button onClick={onBack} variant="ghost">← Back</Button>
        <Heading size="md">New Sale</Heading>
        <Box w="70px" />
      </HStack>

      {/* 👇 NEW: Customer Dropdown Selection */}
      <Box mb={4}>
        <Text mb={2} fontWeight="bold" fontSize="sm">Select Customer</Text>
        <Select 
          placeholder="Select a Customer (Optional)" 
          bg="white" 
          size="lg"
          value={selectedCustomerId}
          onChange={handleCustomerSelect}
        >
          {customers.map(cust => (
            <option key={cust.id} value={cust.id}>
              {cust.name} {cust.location ? `(${cust.location})` : ''}
            </option>
          ))}
        </Select>
        {/* Fallback Input if they want to type a name manually */}
        {!selectedCustomerId && (
          <Input 
            mt={2}
            placeholder="Or type Name (Walk-in)" 
            bg="white"
            value={customerName === 'Walk-in Customer' ? '' : customerName}
            onChange={(e) => setCustomerName(e.target.value || 'Walk-in Customer')}
          />
        )}
      </Box>

      <SimpleGrid columns={2} spacing={4} mb={24}>
        {products.map((product) => (
          <Button
            key={product.id}
            height="100px"
            colorScheme="teal"
            variant="outline"
            onClick={() => addToCart(product)}
            display="flex"
            flexDirection="column"
            justifyContent="center"
            whiteSpace="normal"
          >
            <Text fontSize="lg" fontWeight="bold">{product.name}</Text>
            <Text>TZS {product.price ? product.price.toLocaleString() : '0'}</Text>
          </Button>
        ))}
      </SimpleGrid>

      <Box position="fixed" bottom="0" left="0" right="0" bg="white" p={4} borderTop="1px solid" borderColor="gray.200" boxShadow="lg">
        <HStack justifyContent="space-between" mb={4}>
          <Text fontSize="xl" fontWeight="bold">Total:</Text>
          <Text fontSize="2xl" color="teal.600" fontWeight="extrabold">TZS {totalAmount.toLocaleString()}</Text>
        </HStack>
        <Button colorScheme="teal" size="lg" width="100%" onClick={handleCheckout} isDisabled={cart.length === 0} isLoading={isSubmitting}>
          Confirm Sale ({cart.length})
        </Button>
      </Box>

      <Modal isOpen={isOpen} onClose={() => { onClose(); onBack(); }} isCentered size="sm">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader textAlign="center" color="green.500">Sale Successful! 🎉</ModalHeader>
          <ModalBody>
            <VStack spacing={4}>
              <Text textAlign="center">Choose receipt type:</Text>
              <Button colorScheme="green" w="100%" leftIcon={<Text>💬</Text>} onClick={sendWhatsApp}>Send via WhatsApp</Button>
              <Button colorScheme="red" w="100%" leftIcon={<Text>📄</Text>} onClick={generatePDF}>Download PDF Invoice</Button>
            </VStack>
          </ModalBody>
          <ModalFooter justifyContent="center">
            <Button variant="ghost" onClick={() => { onClose(); onBack(); }}>Close</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  )
}