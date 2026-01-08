// src/components/SalesScreen.jsx
import { useState, useEffect } from 'react'
import {
  Box, Button, VStack, HStack, Heading, Text, Select, Input,
  Table, Thead, Tbody, Tr, Th, Td, IconButton, useToast,
  Card, CardBody, Badge, Switch, FormControl, FormLabel,
  NumberInput, NumberInputField, NumberInputStepper, NumberIncrementStepper, NumberDecrementStepper,
  SimpleGrid, Divider, Spinner, Flex
} from '@chakra-ui/react'
import { DeleteIcon, ArrowBackIcon, LockIcon, UnlockIcon, DownloadIcon } from '@chakra-ui/icons'
// We are adding a simple icon for generic share (using LinkIcon as placeholder or external library usually)
import { ExternalLinkIcon, ChatIcon } from '@chakra-ui/icons' 
import { collection, addDoc, getDocs, updateDoc, doc, getDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../firebase'
import jsPDF from 'jspdf'
import 'jspdf-autotable'

export default function SalesScreen({ onBack }) {
  // --- STATE ---
  const [products, setProducts] = useState([])
  const [customers, setCustomers] = useState([])
  const [loadingData, setLoadingData] = useState(true)
  
  // Transaction State
  const [cart, setCart] = useState([]) 
  const [selectedCustomer, setSelectedCustomer] = useState('')
  const [customerName, setCustomerName] = useState('') 
  const [paymentMethod, setPaymentMethod] = useState('Cash')
  
  // Mode State
  const [isCartonMode, setIsCartonMode] = useState(false)
  const [clickMultiplier, setClickMultiplier] = useState(1)
  
  // TOTAL & CALCULATION STATE
  const [isManualPrice, setIsManualPrice] = useState(false) 
  const [manualTotal, setManualTotal] = useState(0) 
  const [autoTotal, setAutoTotal] = useState(0)
  const [processing, setProcessing] = useState(false)

  // Last Sale State (For Sharing)
  const [lastSale, setLastSale] = useState(null)
  
  const toast = useToast()

  // --- 1. FETCH DATA ---
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoadingData(true)
        const prodSnapshot = await getDocs(collection(db, 'inventory'))
        setProducts(prodSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })))
        
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

  // --- 2. AUTO-CALCULATE LOGIC ---
  useEffect(() => {
    const calculated = cart.reduce((sum, item) => sum + item.price, 0)
    setAutoTotal(calculated)
    if (!isManualPrice) setManualTotal(calculated)
  }, [cart, isManualPrice])

  // --- 3. ADD TO CART ---
  const addToCart = (product) => {
    const sizeMultiplier = isCartonMode ? 12 : 1
    const quantityCount = parseInt(clickMultiplier) || 1
    const totalQtyToAdd = sizeMultiplier * quantityCount

    const rawPrice = product.sellingPrice !== undefined ? product.sellingPrice : (product.price || 0)
    const unitPrice = Number(rawPrice)
    const priceToAdd = unitPrice * totalQtyToAdd

    setCart(prevCart => {
      const existingItem = prevCart.find(item => item.id === product.id)
      
      if (existingItem) {
        return prevCart.map(item => 
          item.id === product.id 
            ? { ...item, qty: item.qty + totalQtyToAdd, price: item.price + priceToAdd }
            : item
        )
      } else {
        return [...prevCart, {
          id: product.id,
          name: product.name,
          unitPrice: unitPrice,
          qty: totalQtyToAdd,
          price: priceToAdd
        }]
      }
    })
    
    toast({
        title: `Added ${totalQtyToAdd} items`,
        status: "success",
        duration: 500,
        position: "top-right",
    })
  }

  // --- 4. REMOVE FROM CART ---
  const removeFromCart = (index) => {
    setCart(cart.filter((_, i) => i !== index))
  }

  // --- 5. PDF GENERATION ---
  const createAndDownloadPdf = (saleData, saleId) => {
    const docPDF = new jsPDF()
    docPDF.setFontSize(22)
    docPDF.text("NYAMOYA ENTERPRISES", 14, 20)
    docPDF.setFontSize(10)
    docPDF.text(`Date: ${saleData.date}`, 14, 30)
    docPDF.text(`Invoice #: ${saleId.slice(0, 8).toUpperCase()}`, 14, 36)
    docPDF.text(`Customer: ${saleData.customerName}`, 14, 42)

    docPDF.autoTable({
      startY: 50,
      head: [['Item', 'Qty', 'Total']],
      body: saleData.items.map(item => [item.name, item.qty, item.price.toLocaleString()]),
    })

    const finalY = docPDF.lastAutoTable.finalY + 10
    docPDF.setFontSize(14)
    docPDF.text(`Total Paid: ${Number(saleData.totalAmount).toLocaleString()} TZS`, 14, finalY)

    docPDF.save(`Invoice_${saleId}.pdf`)
  }

  // --- 6. WHATSAPP & SHARE GENERATOR ---
  const generateShareText = (saleData, saleId) => {
    let text = `🧾 *RECEIPT - NYAMOYA ENTERPRISES*\n`
    text += `📅 Date: ${saleData.date}\n`
    text += `👤 Customer: ${saleData.customerName}\n`
    text += `🔢 Inv: ${saleId.slice(0, 6).toUpperCase()}\n\n`
    text += `*ITEMS:*\n`
    
    saleData.items.forEach(item => {
        text += `• ${item.name} (x${item.qty}) - ${item.price.toLocaleString()}/=\n`
    })
    
    text += `\n💰 *TOTAL PAID: ${saleData.totalAmount.toLocaleString()} TZS*\n`
    text += `✅ Paid via ${saleData.paymentMethod}\n\n`
    text += `Thank you for your business!`
    
    return encodeURIComponent(text)
  }

  const shareToWhatsApp = () => {
    if (!lastSale) return
    const text = generateShareText(lastSale.data, lastSale.id)
    window.open(`https://wa.me/?text=${text}`, '_blank')
  }

  const shareNative = async () => {
    if (!lastSale) return
    const textRaw = decodeURIComponent(generateShareText(lastSale.data, lastSale.id))
    
    if (navigator.share) {
        try {
            await navigator.share({
                title: 'Nyamoya Receipt',
                text: textRaw,
            })
        } catch (err) {
            console.log('Error sharing', err)
        }
    } else {
        // Fallback: Copy to clipboard
        navigator.clipboard.writeText(textRaw)
        toast({ title: "Receipt copied to clipboard!", status: "info" })
    }
  }

  // --- 7. CHECKOUT ---
  const handleCheckout = async () => {
    if (cart.length === 0) return
    setProcessing(true)

    try {
      const finalAmount = isManualPrice ? Number(manualTotal) : Number(autoTotal)
      if (isNaN(finalAmount)) throw new Error("Invalid Total Price")

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

      for (const item of cart) {
        const productRef = doc(db, 'inventory', item.id)
        const snap = await getDoc(productRef)
        if (snap.exists()) {
          const current = Number(snap.data().currentStock) || 0
          await updateDoc(productRef, { currentStock: current - item.qty })
        }
      }

      // Auto Download
      createAndDownloadPdf(saleData, docRef.id)

      // Set State for Sharing
      setLastSale({ data: saleData, id: docRef.id })

      toast({ title: "Sale Completed!", status: "success" })
      
      // Reset
      setCart([])
      setManualTotal(0)
      setAutoTotal(0)
      setIsManualPrice(false)
      setCustomerName('')
      setSelectedCustomer('')
      setClickMultiplier(1)

    } catch (error) {
      console.error(error)
      toast({ title: "Sale Failed", description: error.message, status: "error" })
    } finally {
      setProcessing(false)
    }
  }

  return (
    <Box p={5} maxW="1600px" mx="auto">
      <HStack mb={6} justifyContent="space-between">
        <HStack>
            <ArrowBackIcon boxSize={6} color="gray.500" cursor="pointer" onClick={onBack} _hover={{ color: "teal.600" }} />
            <Heading size="lg" color="teal.700">New Sale</Heading>
        </HStack>
        <Badge colorScheme={isCartonMode ? "orange" : "teal"} p={2} borderRadius="md" fontSize="md">
            {isCartonMode ? "📦 BULK MODE" : "🧴 UNIT MODE"}
        </Badge>
      </HStack>

      <Flex direction={{ base: 'column', lg: 'row' }} gap={6}>
        
        {/* LEFT SIDE: INPUTS */}
        <VStack flex={2} w="100%" spacing={5} align="stretch">
          
          <Box bg="white" p={4} borderRadius="lg" shadow="sm" border="1px solid" borderColor="gray.100">
            <Text mb={2} fontWeight="bold" color="gray.600">Customer</Text>
            <HStack>
                <Select placeholder="Registered Customer" value={selectedCustomer} onChange={(e) => setSelectedCustomer(e.target.value)}>
                    {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </Select>
                <Input placeholder="Or Walk-in Name" value={customerName} onChange={(e) => setCustomerName(e.target.value)} isDisabled={!!selectedCustomer} />
            </HStack>
          </Box>

          <HStack bg={isCartonMode ? "orange.50" : "teal.50"} p={4} borderRadius="lg" justifyContent="space-between" border="1px dashed" borderColor={isCartonMode ? "orange.300" : "teal.300"}>
            <FormControl display='flex' alignItems='center' w="auto">
                <Switch size="lg" colorScheme="orange" isChecked={isCartonMode} onChange={() => setIsCartonMode(!isCartonMode)} mr={2} />
                <VStack align="flex-start" spacing={0}>
                    <Text fontWeight="bold" fontSize="md">{isCartonMode ? "Selling CARTONS (x12)" : "Selling UNITS (x1)"}</Text>
                </VStack>
            </FormControl>

            <HStack bg="white" p={2} borderRadius="md" shadow="sm">
                <Text fontSize="sm" fontWeight="bold" color="gray.600">Quantity:</Text>
                <NumberInput 
                    size="md" 
                    maxW="100px" 
                    min={1} 
                    value={clickMultiplier} 
                    onChange={(val) => setClickMultiplier(val)}
                >
                    <NumberInputField fontWeight="bold" textAlign="center" />
                    <NumberInputStepper>
                        <NumberIncrementStepper />
                        <NumberDecrementStepper />
                    </NumberInputStepper>
                </NumberInput>
            </HStack>
          </HStack>

          <Text fontWeight="bold" fontSize="lg" mt={2}>Tap Product to Add</Text>
          {loadingData ? (
             <Flex justify="center" p={10}><Spinner size="xl" /></Flex>
          ) : (
             <SimpleGrid columns={{ base: 1, sm: 2, md: 3 }} spacing={4}>
                {products.length === 0 ? <Text>No inventory found.</Text> : products.map(product => (
                  <Button
                    key={product.id}
                    height="120px"
                    colorScheme={isCartonMode ? "orange" : "teal"}
                    variant="outline"
                    flexDirection="column"
                    justifyContent="center"
                    boxShadow="sm"
                    _hover={{ bg: isCartonMode ? "orange.100" : "teal.50", transform: "translateY(-2px)", boxShadow: "md" }}
                    onClick={() => addToCart(product)}
                  >
                    <Text fontSize="lg" fontWeight="bold" mb={1}>{product.name}</Text>
                    <Text fontSize="md" color="gray.600">
                        TZS {(product.sellingPrice || product.price || 0).toLocaleString()} 
                    </Text>
                    {isCartonMode && <Badge mt={2} colorScheme="red">12 Pack</Badge>}
                  </Button>
                ))}
             </SimpleGrid>
          )}
        </VStack>

        {/* RIGHT SIDE: CART */}
        <VStack flex={1} w="100%" spacing={5} align="stretch">
           <Card variant="outline" borderColor="gray.200" boxShadow="lg" position="sticky" top="20px">
             <CardBody>
               <Heading size="md" mb={4} pb={2} borderBottom="1px solid #eee">Current Order</Heading>
               
               {/* --- NEW: SHARE & DOWNLOAD SECTION --- */}
               {lastSale && cart.length === 0 && (
                   <VStack mb={4} p={3} bg="green.50" borderRadius="md" border="1px dashed" borderColor="green.300" spacing={3} align="stretch">
                       <Flex justify="space-between" align="center">
                            <Text fontSize="sm" fontWeight="bold" color="green.800">Sale Success!</Text>
                            <Badge colorScheme="green">Saved</Badge>
                       </Flex>
                       
                       <SimpleGrid columns={2} spacing={2}>
                           <Button 
                              size="sm" 
                              leftIcon={<ChatIcon />} 
                              colorScheme="whatsapp"
                              onClick={shareToWhatsApp}
                           >
                               WhatsApp
                           </Button>
                           <Button 
                              size="sm" 
                              leftIcon={<ExternalLinkIcon />} 
                              colorScheme="blue"
                              variant="outline"
                              onClick={shareNative}
                           >
                               Share / Copy
                           </Button>
                       </SimpleGrid>
                       
                       <Button 
                          size="xs" 
                          leftIcon={<DownloadIcon />} 
                          variant="ghost" 
                          colorScheme="gray"
                          onClick={() => createAndDownloadPdf(lastSale.data, lastSale.id)}
                       >
                           Download PDF Again
                       </Button>
                   </VStack>
               )}
               {/* --------------------------- */}

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
                    <option value="Mobile Money">Mobile Money</option>
                    <option value="Credit">Credit (Debt)</option>
                 </Select>
               </FormControl>

               <Box bg={isManualPrice ? "orange.50" : "teal.50"} p={4} borderRadius="md" border="1px solid" borderColor={isManualPrice ? "orange.200" : "teal.200"}>
                 <HStack justifyContent="space-between" mb={2}>
                    <Text fontWeight="bold" fontSize="lg">TOTAL (TZS):</Text>
                    <HStack>
                        <Switch size="sm" colorScheme="orange" isChecked={isManualPrice} onChange={() => setIsManualPrice(!isManualPrice)} />
                        {isManualPrice ? <UnlockIcon color="orange.500"/> : <LockIcon color="teal.500"/>}
                    </HStack>
                 </HStack>

                 <NumberInput 
                    size="lg" 
                    value={isManualPrice ? manualTotal : autoTotal} 
                    onChange={(val) => setManualTotal(val)}
                    min={0}
                    isDisabled={!isManualPrice}
                 >
                    <NumberInputField bg="white" fontWeight="bold" fontSize="2xl" textAlign="right" color={isManualPrice ? "orange.600" : "teal.700"} />
                 </NumberInput>
               </Box>

               <Button mt={4} w="100%" colorScheme="teal" size="lg" height="60px" fontSize="xl" onClick={handleCheckout} isDisabled={cart.length === 0} isLoading={processing}>
                  Confirm Sale
               </Button>

             </CardBody>
           </Card>
        </VStack>

      </Flex>
    </Box>
  )
}