// src/components/ProductionScreen.jsx
import { useState, useEffect } from 'react'
import { Box, Button, VStack, Heading, HStack, Text, Input, Select, IconButton, useToast, Spinner, SimpleGrid } from '@chakra-ui/react'
import { collection, getDocs, addDoc, doc, updateDoc, increment, serverTimestamp, getDoc } from 'firebase/firestore'
import { db } from '../firebase'
import { logAction } from '../utils/logger'

export default function ProductionScreen({ onBack }) {
  const [products, setProducts] = useState([])
  const [rawMaterials, setRawMaterials] = useState([])
  const [loading, setLoading] = useState(true)

  const [selectedProduct, setSelectedProduct] = useState('')
  const [batchSize, setBatchSize] = useState('')
  const [batchNumber, setBatchNumber] = useState(`B-${Math.floor(Math.random() * 10000)}`)
  
  const [selectedMaterialId, setSelectedMaterialId] = useState('')
  const [usedQty, setUsedQty] = useState('')
  const [ingredientsUsed, setIngredientsUsed] = useState([])

  const toast = useToast()

  useEffect(() => {
    const fetchData = async () => {
      try {
        const prodSnap = await getDocs(collection(db, "inventory"))
        const prodList = []
        prodSnap.forEach(d => prodList.push({ id: d.id, ...d.data() }))
        setProducts(prodList)

        const matSnap = await getDocs(collection(db, "raw_materials"))
        const matList = []
        matSnap.forEach(d => matList.push({ id: d.id, ...d.data() }))
        setRawMaterials(matList)
      } catch (error) {
        toast({ title: "Error loading data", status: "error" })
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const addIngredient = () => {
    if (!selectedMaterialId || !usedQty) return
    const material = rawMaterials.find(m => m.id === selectedMaterialId)
    const qty = parseFloat(usedQty)
    const cost = qty * (material.averageCost || 0)

    const newIngredient = {
      id: material.id,
      name: material.name,
      qty: qty,
      unit: material.unit,
      cost: cost
    }
    setIngredientsUsed([...ingredientsUsed, newIngredient])
    setUsedQty('')
    setSelectedMaterialId('')
  }

  const removeIngredient = (index) => {
    const newList = [...ingredientsUsed]
    newList.splice(index, 1)
    setIngredientsUsed(newList)
  }

  const totalBatchCost = ingredientsUsed.reduce((sum, item) => sum + item.cost, 0)
  const costPerUnit = batchSize > 0 ? totalBatchCost / parseFloat(batchSize) : 0

  // 3. COMPLETE PRODUCTION (With Cost Averaging 💰)
  const handleProduce = async () => {
    if (!selectedProduct || !batchSize || ingredientsUsed.length === 0) {
      toast({ title: "Check inputs", status: "warning" })
      return
    }

    try {
      const prodId = selectedProduct
      const qtyProduced = parseFloat(batchSize)
      const newBatchUnitCost = costPerUnit

      // 1. Get Current Product Data to Calculate Average
      const productRef = doc(db, "inventory", prodId)
      const productSnap = await getDoc(productRef)
      const currentData = productSnap.data()
      
      const currentStock = currentData.currentStock || 0
      const currentAvgCost = currentData.averageUnitCost || 0 // This might be 0 initially

      // 🧮 Weighted Average Formula
      const totalValueOld = currentStock * currentAvgCost
      const totalValueNew = qtyProduced * newBatchUnitCost
      const totalNewStock = currentStock + qtyProduced
      
      const newAverageUnitCost = totalNewStock > 0 
        ? (totalValueOld + totalValueNew) / totalNewStock 
        : newBatchUnitCost

      // 2. Update Inventory (Stock + Cost)
      await updateDoc(productRef, { 
        currentStock: totalNewStock,
        averageUnitCost: newAverageUnitCost // Saving the new cost!
      })

      // 3. Deduct Raw Materials
      for (const item of ingredientsUsed) {
        const matRef = doc(db, "raw_materials", item.id)
        await updateDoc(matRef, { currentStock: increment(-item.qty) })
      }

      // 4. Save Batch Log
      await addDoc(collection(db, "production_log"), {
        batchNumber,
        product: products.find(p => p.id === selectedProduct)?.name,
        quantityProduced: qtyProduced,
        ingredients: ingredientsUsed,
        totalCost: totalBatchCost,
        unitCost: newBatchUnitCost,
        date: serverTimestamp(),
        user: "Staff"
      })

      await logAction('Staff', 'Production', `Produced ${qtyProduced} units. Cost updated to TZS ${Math.round(newAverageUnitCost)}/unit`)

      toast({ 
        title: "Production Complete & Cost Updated! 💰", 
        description: `New Avg Cost: TZS ${Math.round(newAverageUnitCost)}/unit`,
        status: "success"
      })

      setIngredientsUsed([])
      setBatchSize('')
      setBatchNumber(`B-${Math.floor(Math.random() * 10000)}`)

    } catch (error) {
      console.error(error)
      toast({ title: "Production Failed", status: "error" })
    }
  }

  if (loading) return <Box p={10} textAlign="center"><Spinner size="xl" /></Box>

  return (
    <Box p={4} maxW="800px" mx="auto">
      <HStack mb={6}>
        <Button onClick={onBack} variant="ghost">← Back</Button>
        <Heading size="md" color="orange.600">Production Line 🏭</Heading>
      </HStack>

      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={8}>
        <VStack spacing={4} align="stretch" bg="white" p={6} borderRadius="xl" shadow="sm">
          <Heading size="sm">1. Batch Details</Heading>
          <Box>
            <Text fontSize="sm" fontWeight="bold">Batch Number</Text>
            <Input value={batchNumber} isReadOnly bg="gray.100" />
          </Box>
          <Box>
            <Text fontSize="sm" fontWeight="bold">Product to Make</Text>
            <Select placeholder="Select Product" value={selectedProduct} onChange={(e) => setSelectedProduct(e.target.value)}>
              {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </Select>
          </Box>
          <Box>
            <Text fontSize="sm" fontWeight="bold">Quantity (Units)</Text>
            <Input type="number" placeholder="e.g. 50" value={batchSize} onChange={(e) => setBatchSize(e.target.value)} />
          </Box>
        </VStack>

        <VStack spacing={4} align="stretch" bg="white" p={6} borderRadius="xl" shadow="sm">
          <Heading size="sm">2. Ingredients Used</Heading>
          <HStack>
            <Select placeholder="Raw Material" value={selectedMaterialId} onChange={(e) => setSelectedMaterialId(e.target.value)}>
              {rawMaterials.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </Select>
            <Input w="80px" placeholder="Qty" type="number" value={usedQty} onChange={(e) => setUsedQty(e.target.value)} />
            <Button onClick={addIngredient} colorScheme="orange">+</Button>
          </HStack>

          <Box border="1px solid" borderColor="gray.100" borderRadius="md" p={2} minH="150px">
            {ingredientsUsed.map((item, index) => (
              <HStack key={index} justifyContent="space-between" p={2} borderBottom="1px solid" borderColor="gray.50">
                <Text fontSize="sm">{item.name} ({item.qty}{item.unit})</Text>
                <HStack>
                  <Text fontSize="sm" fontWeight="bold">{Math.round(item.cost).toLocaleString()} TZS</Text>
                  <IconButton size="xs" icon={<Text>🗑️</Text>} onClick={() => removeIngredient(index)} colorScheme="red" variant="ghost" />
                </HStack>
              </HStack>
            ))}
          </Box>

          <Box bg="orange.50" p={4} borderRadius="md">
             <HStack justifyContent="space-between">
               <Text fontSize="sm">Est. Unit Cost:</Text>
               <Text fontWeight="bold" color="green.600">
                 TZS {batchSize > 0 ? Math.round(costPerUnit).toLocaleString() : '0'}
               </Text>
             </HStack>
          </Box>

          <Button colorScheme="orange" size="lg" onClick={handleProduce} isDisabled={ingredientsUsed.length === 0}>
            Confirm Production
          </Button>
        </VStack>
      </SimpleGrid>
    </Box>
  )
}