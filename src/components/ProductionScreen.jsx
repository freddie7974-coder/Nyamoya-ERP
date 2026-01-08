// src/components/ProductionScreen.jsx
import { useState, useEffect } from 'react'
import {
  Box, Button, VStack, HStack, Heading, Text, Select, Input,
  Table, Thead, Tbody, Tr, Th, Td, IconButton, useToast,
  Card, CardBody, SimpleGrid, Badge, Switch, FormControl, FormLabel,
  NumberInput, NumberInputField, Divider, Flex
} from '@chakra-ui/react'
import { DeleteIcon, AddIcon, ArrowBackIcon } from '@chakra-ui/icons'
import { collection, addDoc, getDocs, updateDoc, doc, getDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../firebase'

export default function ProductionScreen({ onBack }) {
  // --- STATE ---
  // Data
  const [products, setProducts] = useState([])
  const [materials, setMaterials] = useState([])
  
  // Batch Logic
  const [selectedProduct, setSelectedProduct] = useState('')
  const [batchNumber, setBatchNumber] = useState('')
  
  // Quantity Logic (The New Part)
  const [isCartonMode, setIsCartonMode] = useState(false)
  const [quantity, setQuantity] = useState('') // The final number sent to DB
  const [inputCartons, setInputCartons] = useState('')
  const [inputLoose, setInputLoose] = useState('')

  // Ingredients Logic
  const [selectedMaterial, setSelectedMaterial] = useState('')
  const [materialQty, setMaterialQty] = useState('')
  const [usedMaterials, setUsedMaterials] = useState([])
  
  const [loading, setLoading] = useState(false)
  const toast = useToast()

  // --- 1. FETCH DATA ---
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch Finished Goods (Corrected to 'inventory')
        const prodSnap = await getDocs(collection(db, 'inventory'))
        setProducts(prodSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })))

        // Fetch Raw Materials
        const matSnap = await getDocs(collection(db, 'raw_materials'))
        setMaterials(matSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })))
        
        // Generate random Batch #
        setBatchNumber(`BATCH-${Date.now().toString().slice(-6)}`)
      } catch (error) {
        console.error("Error loading data:", error)
        toast({ title: "Error loading data", status: "error" })
      }
    }
    fetchData()
  }, [])

  // --- 2. CALCULATE TOTAL QUANTITY ---
  // Whenever the user types in Cartons or Loose, update the main 'quantity'
  useEffect(() => {
    if (isCartonMode) {
      const cartons = Number(inputCartons) || 0
      const loose = Number(inputLoose) || 0
      const total = (cartons * 12) + loose
      setQuantity(total === 0 ? '' : total)
    }
  }, [inputCartons, inputLoose, isCartonMode])

  // --- 3. INGREDIENT MANAGEMENT ---
  const addMaterial = () => {
    if (!selectedMaterial || !materialQty) return
    const mat = materials.find(m => m.id === selectedMaterial)
    
    setUsedMaterials([...usedMaterials, {
      id: mat.id,
      name: mat.name,
      qty: Number(materialQty),
      cost: mat.averageCost || 0,
      unit: mat.unit
    }])
    
    setSelectedMaterial('')
    setMaterialQty('')
  }

  const removeMaterial = (index) => {
    setUsedMaterials(usedMaterials.filter((_, i) => i !== index))
  }

  // Calculate Costs
  const totalBatchCost = usedMaterials.reduce((sum, item) => sum + (item.qty * item.cost), 0)
  const estimatedUnitCost = quantity ? (totalBatchCost / quantity) : 0

  // --- 4. CONFIRM PRODUCTION ---
  const handleProduction = async () => {
    if (!selectedProduct || !quantity || usedMaterials.length === 0) {
      toast({ title: "Please fill all fields", status: "warning" })
      return
    }

    setLoading(true)
    try {
      // A. Deduct Raw Materials
      for (const item of usedMaterials) {
        const matRef = doc(db, 'raw_materials', item.id)
        const matSnap = await getDoc(matRef)
        if (matSnap.exists()) {
          const current = matSnap.data().currentStock || 0
          await updateDoc(matRef, { currentStock: current - item.qty })
        }
      }

      // B. Add to Finished Stock (inventory)
      const prodRef = doc(db, 'inventory', selectedProduct)
      const prodSnap = await getDoc(prodRef)
      
      if (prodSnap.exists()) {
        const currentStock = prodSnap.data().currentStock || 0
        const currentAvgCost = prodSnap.data().averageUnitCost || 0
        
        // Weighted Average Cost Calculation
        const oldValue = currentStock * currentAvgCost
        const newValue = totalBatchCost // The cost of THIS batch
        const newTotalStock = Number(currentStock) + Number(quantity)
        const newAvgCost = (oldValue + newValue) / newTotalStock

        await updateDoc(prodRef, {
          currentStock: newTotalStock,
          averageUnitCost: newAvgCost
        })
      }

      // C. Save Production Log
      await addDoc(collection(db, 'production_logs'), {
        date: new Date().toISOString().split('T')[0],
        timestamp: serverTimestamp(),
        batchNumber,
        productId: selectedProduct,
        quantityProduced: Number(quantity),
        ingredientsUsed: usedMaterials,
        totalCost: totalBatchCost,
        unitCost: estimatedUnitCost
      })

      toast({ title: "Production Recorded!", status: "success" })
      
      // Reset Form
      setUsedMaterials([])
      setQuantity('')
      setInputCartons('')
      setInputLoose('')
      setBatchNumber(`BATCH-${Date.now().toString().slice(-6)}`)
    } catch (error) {
      console.error(error)
      toast({ title: "Production Failed", status: "error" })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Box p={5} maxW="1600px" mx="auto">
      {/* Header */}
      <HStack mb={6}>
        <ArrowBackIcon 
            boxSize={6} 
            color="gray.500" 
            cursor="pointer" 
            onClick={onBack} 
            _hover={{ color: "teal.600" }}
        />
        <Heading size="lg" color="teal.700">Production Line</Heading>
      </HStack>

      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={8}>
        
        {/* LEFT COLUMN: Batch Setup */}
        <VStack spacing={5} align="stretch">
          <Card variant="outline" boxShadow="sm">
            <CardBody>
              <Heading size="md" mb={4} color="gray.600">1. Output Details</Heading>
              
              <VStack spacing={4}>
                <FormControl>
                  <FormLabel>Batch Number</FormLabel>
                  <Input 
                    value={batchNumber} 
                    onChange={(e) => setBatchNumber(e.target.value)} 
                    bg="gray.50" 
                    fontWeight="bold"
                  />
                </FormControl>

                <FormControl>
                  <FormLabel>Product to Make</FormLabel>
                  <Select 
                    placeholder="Select Finished Product" 
                    value={selectedProduct} 
                    onChange={(e) => setSelectedProduct(e.target.value)}
                  >
                    {products.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </Select>
                </FormControl>

                {/* --- NEW: Carton Mode Switch --- */}
                <Box w="100%" p={4} bg={isCartonMode ? "orange.50" : "blue.50"} borderRadius="md" border="1px dashed" borderColor={isCartonMode ? "orange.300" : "blue.300"}>
                    <Flex justify="space-between" mb={3}>
                        <Text fontWeight="bold" fontSize="sm">
                            {isCartonMode ? "📦 Calculation Mode: CARTONS + LOOSE" : "🔢 Calculation Mode: TOTAL UNITS"}
                        </Text>
                        <Switch colorScheme="orange" isChecked={isCartonMode} onChange={() => setIsCartonMode(!isCartonMode)} />
                    </Flex>

                    {isCartonMode ? (
                        <HStack>
                            <FormControl>
                                <FormLabel fontSize="xs">Cartons (x12)</FormLabel>
                                <NumberInput min={0}>
                                    <NumberInputField bg="white" placeholder="0" value={inputCartons} onChange={(e) => setInputCartons(e.target.value)} />
                                </NumberInput>
                            </FormControl>
                            <Text pt={6} fontWeight="bold">+</Text>
                            <FormControl>
                                <FormLabel fontSize="xs">Loose Jars</FormLabel>
                                <NumberInput min={0}>
                                    <NumberInputField bg="white" placeholder="0" value={inputLoose} onChange={(e) => setInputLoose(e.target.value)} />
                                </NumberInput>
                            </FormControl>
                        </HStack>
                    ) : (
                        <FormControl>
                            <FormLabel fontSize="xs">Total Quantity Produced</FormLabel>
                            <NumberInput min={0}>
                                <NumberInputField bg="white" placeholder="e.g. 50" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
                            </NumberInput>
                        </FormControl>
                    )}
                    
                    {/* Visual Summary */}
                    <Flex mt={3} justify="space-between" align="center" borderTop="1px solid #ddd" pt={2}>
                        <Text fontSize="sm" color="gray.600">Total Output:</Text>
                        <Badge fontSize="lg" colorScheme="teal" px={2}>{Number(quantity) || 0} Units</Badge>
                    </Flex>
                </Box>

              </VStack>
            </CardBody>
          </Card>
        </VStack>

        {/* RIGHT COLUMN: Ingredients */}
        <VStack spacing={5} align="stretch">
          <Card variant="outline" boxShadow="sm">
            <CardBody>
              <Heading size="md" mb={4} color="gray.600">2. Ingredients Used</Heading>
              
              <HStack mb={4}>
                <Select placeholder="Select Raw Material" value={selectedMaterial} onChange={(e) => setSelectedMaterial(e.target.value)}>
                  {materials.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.name} (Stock: {m.currentStock} {m.unit})
                    </option>
                  ))}
                </Select>
                <Input 
                  placeholder="Qty" 
                  w="80px" 
                  type="number"
                  value={materialQty}
                  onChange={(e) => setMaterialQty(e.target.value)}
                />
                <IconButton icon={<AddIcon />} colorScheme="blue" onClick={addMaterial} />
              </HStack>

              <Table size="sm" variant="simple">
                <Thead><Tr><Th>Material</Th><Th isNumeric>Qty</Th><Th isNumeric>Cost (Est)</Th><Th></Th></Tr></Thead>
                <Tbody>
                  {usedMaterials.map((item, index) => (
                    <Tr key={index}>
                      <Td>{item.name}</Td>
                      <Td isNumeric>{item.qty} {item.unit}</Td>
                      <Td isNumeric>{(item.qty * item.cost).toLocaleString()}</Td>
                      <Td><IconButton icon={<DeleteIcon />} size="xs" colorScheme="red" variant="ghost" onClick={() => removeMaterial(index)} /></Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
              
              {usedMaterials.length === 0 && (
                <Text textAlign="center" color="gray.400" fontSize="sm" mt={4}>
                  No ingredients added yet.
                </Text>
              )}

            </CardBody>
          </Card>

          {/* COST SUMMARY & ACTION */}
          <Card bg="teal.50" border="1px solid" borderColor="teal.200">
            <CardBody>
               <VStack spacing={1} align="stretch" mb={4}>
                 <HStack justify="space-between">
                    <Text>Batch Cost:</Text>
                    <Text fontWeight="bold">{totalBatchCost.toLocaleString()} TZS</Text>
                 </HStack>
                 <HStack justify="space-between" color="teal.700">
                    <Text>Cost Per Jar:</Text>
                    <Text fontWeight="bold" fontSize="lg">
                        {estimatedUnitCost.toFixed(0).toLocaleString()} TZS
                    </Text>
                 </HStack>
               </VStack>

               <Button 
                 w="100%" 
                 colorScheme="teal" 
                 size="lg" 
                 onClick={handleProduction}
                 isLoading={loading}
                 isDisabled={!quantity || usedMaterials.length === 0}
               >
                 Confirm Production
               </Button>
            </CardBody>
          </Card>

        </VStack>
      </SimpleGrid>
    </Box>
  )
}