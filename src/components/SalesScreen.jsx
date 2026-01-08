// src/components/SalesScreen.jsx
import { useState, useEffect } from 'react'
import {
  Box, Button, VStack, HStack, Heading, Text, Select, Input,
  Table, Thead, Tbody, Tr, Th, Td, IconButton, useToast,
  Card, CardBody, Badge, Switch, FormControl, FormLabel,
  NumberInput, NumberInputField, NumberInputStepper, NumberIncrementStepper, NumberDecrementStepper
} from '@chakra-ui/react'
import { DeleteIcon, AddIcon } from '@chakra-ui/icons'
import { collection, addDoc, getDocs, updateDoc, doc, getDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../firebase'
import jsPDF from 'jspdf'
import 'jspdf-autotable'

export default function SalesScreen() {
  // Database Data
  const [products, setProducts] = useState([])
  const [customers, setCustomers] = useState([])
  
  // Transaction State
  const [cart, setCart] = useState([]) // Stores { id, name, qty, price, unitPrice }
  const [selectedCustomer, setSelectedCustomer] = useState('')
  const [customerName, setCustomerName] = useState('') // For Walk-ins
  const [paymentMethod, setPaymentMethod] = useState('Cash')
  
  // Custom Features
  const [isCartonMode, setIsCartonMode] = useState(false) // Toggle for "Box of 12"
  const [manualTotal, setManualTotal] = useState('') // Allows editing the final price
  const [loading, setLoading] = useState(false)
  
  const toast = useToast()

  // 1. Fetch Data
  useEffect(() => {
    const fetchData = async () => {
      // Get Products
      const prodSnapshot = await getDocs(collection(db, 'products'))
      setProducts(prodSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })))
      
      // Get Customers
      const custSnapshot = await getDocs(collection(db, 'customers'))
      setCustomers(custSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })))
    }
    fetchData()
  }, [])

  // 2. Auto-Update Total (Unless user manually typed one)
  useEffect(() => {
    const calculated = cart.reduce((sum, item) => sum + item.price, 0)
    // Only auto-update if the user hasn't typed a custom override, OR if the cart is empty
    if (manualTotal === '' || cart.length === 0 || manualTotal == calculated) {
        setManualTotal(calculated)
    }
  }, [cart])


  // 3. Add to Cart Logic
  const addToCart = (product) => {
    // Determine Quantity (1 or 12?)
    const quantityToAdd = isCartonMode ? 12 : 1
    const priceToAdd = product.sellingPrice * quantityToAdd

    setCart(prevCart => {
      const existingItem = prevCart.find(item => item.id === product.id)
      
      if (existingItem) {
        // If item exists, just increase quantity
        return prevCart.map(item => 
          item.id === product.id 
            ? { ...item, qty: item.qty + quantityToAdd, price: item.price + priceToAdd }
            : item
        )
      } else {
        // If new, add to list
        return [...prevCart, {
          id: product.id,
          name: product.name,
          unitPrice: product.sellingPrice,
          qty: quantityToAdd,
          price: priceToAdd
        }]
      }
    })
    
    toast({
        title: `Added ${isCartonMode ? "1 Carton (12)" : "1 Unit"} of ${product.name}`,
        status: "info",
        duration: 1000,
    })
  }

  // 4. Remove from Cart
  const removeFromCart = (index) => {
    const newCart = cart.filter((_, i) => i !== index)
    setCart(newCart)
    // Reset manual total to calculation if cart changes
    const calculated = newCart.reduce((sum, item) => sum + item.price, 0)
    setManualTotal(calculated)
  }

  // 5. Generate PDF Invoice
  const generateInvoice = (saleData, saleId) => {
    const doc = new jsPDF()
    
    // Header
    doc.setFontSize(22)
    doc.text("NYAMOYA ENTERPRISES", 14, 20)
    doc.setFontSize(10)
    doc.text("Quality Peanut Butter & Oil", 14, 26)
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 14, 32)
    doc.text(`Invoice #: ${saleId.slice(0, 8).toUpperCase()}`, 14, 38)
    
    // Customer Info
    doc.text(`Customer: ${saleData.customerName}`, 14, 48)
    doc.text(`Payment: ${saleData.paymentMethod}`, 14, 54)

    // Table
    const tableRows = saleData.items.map(item => [
      item.name,
      item.qty,
      item.unitPrice.toLocaleString() + ' TZS',
      item.price.toLocaleString() + ' TZS'
    ])

    doc.autoTable({
      startY: 60,
      head: [['Item', 'Qty', 'Unit Price', 'Total']],
      body: tableRows,
    })

    // Footer Totals
    const finalY = doc.lastAutoTable.finalY + 10
    doc.setFontSize(14)
    doc.text(`Total Amount: ${Number(saleData.totalAmount).toLocaleString()} TZS`, 14, finalY)
    
    doc.save(`Invoice_${saleData.customerName}_${Date.now()}.pdf`)
  }

  // 6. Complete Sale
  const handleCheckout = async () => {
    if (cart.length === 0) return
    setLoading(true)

    try {
      const finalAmount = Number(manualTotal) // Use the editable text box value
      
      // Determine Customer Name
      let finalCustomerName = customerName || "Walk-in Customer"
      if (selectedCustomer) {
        const c = customers.find(c => c.id === selectedCustomer)
        if (c) finalCustomerName = c.name
      }

      // A. Save Sale Record
      const saleData = {
        date: new Date().toISOString().split('T')[0],
        timestamp: serverTimestamp(),
        customerName: finalCustomerName,
        customerId: selectedCustomer || null,
        items: cart, // Saves the full list of items
        totalAmount: finalAmount, // Saves the edited price
        paymentMethod: paymentMethod,
        type: 'income'
      }
      
      const docRef = await addDoc(collection(db, 'sales'), saleData)

      // B. Deduct Stock (Loop through cart)
      for (const item of cart) {
        const productRef = doc(db, 'products', item.id)
        const productSnap = await getDoc(productRef)
        
        if (productSnap.exists()) {
          const currentStock = productSnap.data().currentStock || 0
          await updateDoc(productRef, {
            currentStock: currentStock - item.qty
          })
        }
      }

      // C. Generate PDF
      generateInvoice(saleData, docRef.id)

      toast({ title: "Sale Completed!", status: "success" })
      setCart([])
      setManualTotal('')
      setCustomerName('')
      setSelectedCustomer('')
    } catch (error) {
      console.error(error)
      toast({ title: "Error processing sale", status: "error" })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Box p={5}>
      <Heading size="lg" mb={5} color="teal.600">New Bulk Sale</Heading>

      <HStack spacing={10} alignItems="flex-start" flexDirection={{ base: 'column', md: 'row' }}>
        
        {/* LEFT SIDE: Product Selector */}
        <VStack flex={1} w="100%" spacing={5}>
          
          {/* Customer Selection */}
          <Card w="100%" p={4} variant="outline">
            <VStack>
              <Select placeholder="Select Registered Customer" value={selectedCustomer} onChange={(e) => setSelectedCustomer(e.target.value)}>
                {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
              <Input placeholder="Or type Walk-in Name..." value={customerName} onChange={(e) => setCustomerName(e.target.value)} disabled={!!selectedCustomer} />
            </VStack>
          </Card>

          {/* Mode Switcher: Unit vs Carton */}
          <Card w="100%" bg={isCartonMode ? "orange.50" : "gray.50"}>
            <CardBody>
              <FormControl display='flex' alignItems='center'>
                <FormLabel htmlFor='carton-mode' mb='0' fontWeight="bold">
                  {isCartonMode ? "📦 Selling by CARTON (x12)" : "🧴 Selling by SINGLE UNIT"}
                </FormLabel>
                <Switch id='carton-mode' isChecked={isCartonMode} onChange={() => setIsCartonMode(!isCartonMode)} colorScheme="orange" size="lg" />
              </FormControl>
              <Text fontSize="xs" color="gray.500" mt={2}>
                Toggle this to instantly add items in batches of 12.
              </Text>
            </CardBody>
          </Card>

          {/* Product Grid */}
          <Box w="100%" display="grid" gridTemplateColumns="repeat(auto-fill, minmax(150px, 1fr))" gap={4}>
            {products.map(product => (
              <Button
                key={product.id}
                h="100px"
                colorScheme={isCartonMode ? "orange" : "teal"}
                variant="outline"
                flexDirection="column"
                onClick={() => addToCart(product)}
              >
                <Text fontWeight="bold">{product.name}</Text>
                <Text fontSize="sm">{product.sellingPrice?.toLocaleString()} TZS</Text>
                {isCartonMode && <Badge colorScheme="red" mt={1}>+12 Units</Badge>}
              </Button>
            ))}
          </Box>
        </VStack>

        {/* RIGHT SIDE: The Cart */}
        <VStack flex={1} w="100%" spacing={5}>
          <Card w="100%" boxShadow="md">
            <CardBody>
              <Heading size="md" mb={4}>Current Order</Heading>
              
              {cart.length === 0 ? (
                <Text color="gray.400">Cart is empty...</Text>
              ) : (
                <Table size="sm">
                  <Thead>
                    <Tr>
                      <Th>Item</Th>
                      <Th isNumeric>Qty</Th>
                      <Th isNumeric>Total</Th>
                      <Th></Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {cart.map((item, index) => (
                      <Tr key={index}>
                        <Td>{item.name}</Td>
                        <Td isNumeric fontWeight="bold">{item.qty}</Td>
                        <Td isNumeric>{item.price.toLocaleString()}</Td>
                        <Td>
                          <IconButton icon={<DeleteIcon />} size="xs" colorScheme="red" onClick={() => removeFromCart(index)} />
                        </Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              )}

              <Box mt={6} pt={4} borderTop="1px solid #eee">
                <HStack justifyContent="space-between" mb={2}>
                  <Text fontWeight="bold">Payment Method:</Text>
                  <Select w="150px" size="sm" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                    <option value="Cash">Cash</option>
                    <option value="Bank/Mobile">Mobile Money</option>
                    <option value="Credit">Credit (Debt)</option>
                  </Select>
                </HStack>

                <HStack justifyContent="space-between" mt={4}>
                   <Text fontSize="lg" fontWeight="bold">Grand Total (TZS):</Text>
                   {/* EDITABLE TOTAL FIELD */}
                   <NumberInput 
                      size="lg" 
                      w="200px" 
                      value={manualTotal} 
                      onChange={(valueString) => setManualTotal(valueString)}
                    >
                      <NumberInputField fontWeight="bold" textAlign="right" color="teal.600" />
                   </NumberInput>
                </HStack>
                <Text fontSize="xs" color="gray.500" textAlign="right">
                   (You can edit this amount manually)
                </Text>

                <Button 
                  mt={4} 
                  w="100%" 
                  colorScheme="teal" 
                  size="lg" 
                  onClick={handleCheckout}
                  isDisabled={cart.length === 0}
                  isLoading={loading}
                >
                  Confirm Sale & Print
                </Button>
              </Box>
            </CardBody>
          </Card>
        </VStack>

      </HStack>
    </Box>
  )
}