// src/components/SalesScreen.jsx
import { useState, useEffect } from 'react'
import {
  Box, Button, VStack, HStack, Heading, Text, Select, Input,
  Table, Thead, Tbody, Tr, Th, Td, IconButton, useToast,
  Card, CardBody, Badge, Switch, FormControl, FormLabel,
  NumberInput, NumberInputField, SimpleGrid, Divider, Spinner,
  Flex
} from '@chakra-ui/react'
import { DeleteIcon, ArrowBackIcon } from '@chakra-ui/icons'
import { collection, addDoc, getDocs, updateDoc, doc, getDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../firebase'
import jsPDF from 'jspdf'
import 'jspdf-autotable'

export default function SalesScreen() {
  // --- STATE ---
  const [products, setProducts] = useState([])
  const [customers, setCustomers] = useState([])
  const [loadingData, setLoadingData] = useState(true)
  
  // Transaction State
  const [cart, setCart] = useState([]) 
  const [selectedCustomer, setSelectedCustomer] = useState('')
  const [customerName, setCustomerName] = useState('') 
  const [paymentMethod, setPaymentMethod] = useState('Cash')
  
  // New Features State
  const [isCartonMode, setIsCartonMode] = useState(false) 
  const [manualTotal, setManualTotal] = useState('') 
  const [processing, setProcessing] = useState(false)
  
  const toast = useToast()

  // --- 1. FETCH DATA (UPDATED to 'inventory') ---
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoadingData(true)
        
        // ✅ FIX 1: Changed 'products' to 'inventory' to match your screenshot
        const prodSnapshot = await getDocs(collection(db, 'inventory'))
        
        const prodList = prodSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
        setProducts(prodList)
        
        // Fetch Customers
        const custSnapshot = await getDocs(collection(db, 'customers'))
        setCustomers(custSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })))
      } catch (err) {
        console.error("Error fetching data:", err)
        toast({ title: "Error loading products", status: "error" })
      } finally {
        setLoadingData(false)
      }
    }
    fetchData()
  }, [])

  // --- 2. AUTO-CALCULATE TOTAL ---
  useEffect(() => {
    const calculated = cart.reduce((sum, item) => sum + item.price, 0)
    if (manualTotal === '' || cart.length === 0 || Number(manualTotal) === calculated) {
        setManualTotal(calculated)
    }
  }, [cart])

  // --- 3. ADD TO CART ---
  const addToCart = (product) => {
    const qtyMultiplier = isCartonMode ? 12 : 1
    // Fallback: Check 'sellingPrice', then 'price', then 0
    const unitPrice = product.sellingPrice || product.price || 0 
    const priceToAdd = unitPrice * qtyMultiplier

    setCart(prevCart => {
      const existingItem = prevCart.find(item => item.id === product.id)
      
      if (existingItem) {
        return prevCart.map(item => 
          item.id === product.id 
            ? { ...item, qty: item.qty + qtyMultiplier, price: item.price + priceToAdd }
            : item
        )
      } else {
        return [...prevCart, {
          id: product.id,
          name: product.name,
          unitPrice: unitPrice,
          qty: qtyMultiplier,
          price: priceToAdd
        }]
      }
    })
    
    toast({
        title: `Added ${isCartonMode ? "12x (Carton)" : "1x"} ${product.name}`,
        status: "success",
        duration: 1000,
        position: "top-right"
    })
  }

  // --- 4. REMOVE FROM CART ---
  const removeFromCart = (index) => {
    const newCart = cart.filter((_, i) => i !== index)
    setCart(newCart)
    const calculated = newCart.reduce((sum, item) => sum + item.price, 0)
    setManualTotal(calculated)
  }

  // --- 5. GENERATE PDF ---
  const generateInvoice = (saleData, saleId) => {
    const doc = new jsPDF()
    doc.setFontSize(22)
    doc.text("NYAMOYA ENTERPRISES", 14, 20)
    doc.setFontSize(10)
    doc.text("Quality Peanut Butter & Oil", 14, 26)
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 14, 32)
    doc.text(`Invoice #: ${saleId.slice(0, 8).toUpperCase()}`, 14, 38)
    doc.text(`Customer: ${saleData.customerName}`, 14, 48)
    
    doc.autoTable({
      startY: 60,
      head: [['Item', 'Qty', 'Unit Price', 'Total']],
      body: saleData.items.map(item => [
        item.name, item.qty, item.unitPrice.toLocaleString(), item.price.toLocaleString()
      ]),
    })

    const finalY = doc.lastAutoTable.finalY + 10
    doc.setFontSize(14)
    doc.text(`Total Amount: ${Number(saleData.totalAmount).toLocaleString()} TZS`, 14, finalY)
    doc.save(`Invoice_${saleId}.pdf`)
  }

  // --- 6. CHECKOUT ---
  const handleCheckout = async () => {
    if (cart.length === 0) return
    setProcessing(true)

    try {
      const finalAmount = Number(manualTotal)
      let finalCustomerName = customerName || "Walk-in Customer"
      if (selectedCustomer) {
        const c = customers.find(c => c.id === selectedCustomer)
        if (c) finalCustomerName = c.name
      }

      const saleData = {
        date: new Date().toISOString().split('T')[0],
        timestamp: serverTimestamp(),
        customerName: finalCustomerName,
        customerId: selectedCustomer || null,
        items: cart,
        totalAmount: finalAmount,
        paymentMethod: paymentMethod,
        type: 'income'
      }
      
      const docRef = await addDoc(collection(db, 'sales'), saleData)

      // Deduct Stock
      for (const item of cart) {
        // ✅ FIX 2: Changed 'products' to 'inventory' here too
        const productRef = doc(db, 'inventory', item.id)
        const snap = await getDoc(productRef)
        if (snap.exists()) {
          const current = snap.data().currentStock || 0
          await updateDoc(productRef, { currentStock: current - item.qty })
        }
      }

      generateInvoice(saleData, docRef.id)
      toast({ title: "Sale Completed!", status: "success" })
      
      setCart([])
      setManualTotal('')
      setCustomerName('')
      setSelectedCustomer('')
    } catch (error) {
      console.error(error)
      toast({ title: "Sale Failed", status: "error" })
    } finally {
      setProcessing(false)
    }
  }

  // --- RENDER ---
  return (
    <Box p={5} maxW="1600px" mx="auto">
      <HStack mb={6} justifyContent="space-between">
        <HStack>
            <ArrowBackIcon boxSize={6} color="gray.500" cursor="pointer" />
            <Heading size="lg" color="teal.700">New Sale</Heading>
        </HStack>
        <Badge colorScheme={isCartonMode ? "orange" : "teal"} p={2} borderRadius="md" fontSize="md">
            {isCartonMode ? "📦 BULK MODE ACTIVE" : "🧴 SINGLE UNIT MODE"}
        </Badge>
      </HStack>

      <Flex direction={{ base: 'column', lg: 'row' }} gap={6}>
        
        {/* LEFT SIDE: INPUTS & PRODUCTS */}
        <VStack flex={2} w="100%" spacing={5} align="stretch">
          
          <Box bg="white" p={4} borderRadius="lg" shadow="sm" border="1px solid" borderColor="gray.100">
            <Text mb={2} fontWeight="bold" color="gray.600">Select Customer</Text>
            <VStack spacing={3}>
                <Select placeholder="Select a Customer (Optional)" value={selectedCustomer} onChange={(e) => setSelectedCustomer(e.target.value)}>
                    {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </Select>
                <Input placeholder="Or type Name (Walk-in)" value={customerName} onChange={(e) => setCustomerName(e.target.value)} isDisabled={!!selectedCustomer} />
            </VStack>
          </Box>

          <HStack bg={isCartonMode ? "orange.50" : "teal.50"} p={4} borderRadius="lg" justifyContent="space-between" border="1px dashed" borderColor={isCartonMode ? "orange.300" : "teal.300"}>
            <VStack align="flex-start" spacing={0}>
                <Text fontWeight="bold" fontSize="lg">
                    {isCartonMode ? "Selling by CARTON (x12)" : "Selling by SINGLE UNIT (x1)"}
                </Text>
                <Text fontSize="sm" color="gray.500">
                    {isCartonMode ? "Clicking a product adds 12 items instantly." : "Clicking a product adds 1 item."}
                </Text>
            </VStack>
            <Switch size="lg" colorScheme="orange" isChecked={isCartonMode} onChange={() => setIsCartonMode(!isCartonMode)} />
          </HStack>

          <Text fontWeight="bold" fontSize="lg" mt={2}>Products</Text>
          {loadingData ? (
             <Flex justify="center" p={10}><Spinner size="xl" /></Flex>
          ) : (
             <SimpleGrid columns={{ base: 1, sm: 2, md: 3 }} spacing={4}>
                {products.length === 0 ? <Text>No products found in 'inventory'.</Text> : products.map(product => (
                  <Button
                    key={product.id}
                    height="120px"
                    colorScheme={isCartonMode ? "orange" : "teal"}
                    variant="outline"
                    flexDirection="column"
                    justifyContent="center"
                    boxShadow="sm"
                    _hover={{ bg: isCartonMode ? "orange.50" : "teal.50", transform: "translateY(-2px)", boxShadow: "md" }}
                    onClick={() => addToCart(product)}
                  >
                    <Text fontSize="lg" fontWeight="bold" mb={1}>{product.name}</Text>
                    <Text fontSize="md" color="gray.600">
                        TZS {(product.sellingPrice || product.price || 0).toLocaleString()} 
                    </Text>
                    {isCartonMode && <Badge mt={2} colorScheme="red" bg="red.100" color="red.700">Add 12 Pack</Badge>}
                  </Button>
                ))}
             </SimpleGrid>
          )}
        </VStack>


        {/* RIGHT SIDE: CART & TOTAL */}
        <VStack flex={1} w="100%" spacing={5} align="stretch">
           <Card variant="outline" borderColor="gray.200" boxShadow="lg" position="sticky" top="20px">
             <CardBody>
               <Heading size="md" mb={4} pb={2} borderBottom="1px solid #eee">Current Order</Heading>
               
               <Box maxH="400px" overflowY="auto" mb={4}>
                 {cart.length === 0 ? (
                    <Text color="gray.400" textAlign="center" py={10}>Cart is empty</Text>
                 ) : (
                    <Table size="sm">
                      <Thead><Tr><Th>Item</Th><Th isNumeric>Qty</Th><Th isNumeric>Total</Th><Th></Th></Tr></Thead>
                      <Tbody>
                        {cart.map((item, index) => (
                          <Tr key={index}>
                            <Td>
                                <Text fontWeight="bold" fontSize="sm">{item.name}</Text>
                                <Text fontSize="xs" color="gray.500">@{item.unitPrice}</Text>
                            </Td>
                            <Td isNumeric>{item.qty}</Td>
                            <Td isNumeric>{item.price.toLocaleString()}</Td>
                            <Td><IconButton icon={<DeleteIcon />} size="xs" colorScheme="red" variant="ghost" onClick={() => removeFromCart(index)} /></Td>
                          </Tr>
                        ))}
                      </Tbody>
                    </Table>
                 )}
               </Box>

               <Divider mb={4} />

               <FormControl mb={4}>
                 <FormLabel fontSize="sm">Payment Method</FormLabel>
                 <Select size="sm" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                    <option value="Cash">Cash</option>
                    <option value="Mobile Money">Mobile Money / Bank</option>
                    <option value="Credit">Credit (Debt)</option>
                 </Select>
               </FormControl>

               <Box bg={isCartonMode ? "orange.50" : "teal.50"} p={4} borderRadius="md">
                 <HStack justifyContent="space-between" mb={2}>
                    <Text fontWeight="bold" fontSize="lg">TOTAL (TZS):</Text>
                 </HStack>
                 <NumberInput 
                    size="lg" 
                    value={manualTotal} 
                    onChange={(valueString) => setManualTotal(valueString)} 
                    min={0}
                 >
                    <NumberInputField 
                        bg="white" 
                        fontWeight="bold" 
                        fontSize="xl" 
                        textAlign="right" 
                        color={Number(manualTotal) !== cart.reduce((a,b)=>a+b.price,0) ? "orange.500" : "teal.600"}
                    />
                 </NumberInput>
                 <Text fontSize="xs" textAlign="right" color="gray.500" mt={1}>
                    {Number(manualTotal) !== cart.reduce((a,b)=>a+b.price,0) ? "* Price manually edited" : "Calculated automatically"}
                 </Text>
               </Box>

               <Button 
                  mt={4} 
                  w="100%" 
                  colorScheme="teal" 
                  size="lg" 
                  height="60px"
                  fontSize="xl"
                  onClick={handleCheckout}
                  isDisabled={cart.length === 0}
                  isLoading={processing}
                >
                  Confirm Sale
               </Button>

             </CardBody>
           </Card>
        </VStack>

      </Flex>
    </Box>
  )
}