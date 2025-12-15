// src/components/WastageScreen.jsx
import { useState, useEffect } from 'react'
import { Box, Button, Heading, HStack, Input, Select, useToast, Spinner, VStack, Text, Radio, RadioGroup, Stack, Alert, AlertIcon } from '@chakra-ui/react'
import { collection, getDocs, doc, updateDoc, addDoc, serverTimestamp, increment } from 'firebase/firestore'
import { db } from '../firebase'
import { logAction } from '../utils/logger'

export default function WastageScreen({ onBack }) {
  const [loading, setLoading] = useState(true)
  const [inventoryType, setInventoryType] = useState('raw') // 'raw' or 'product'
  
  const [rawMaterials, setRawMaterials] = useState([])
  const [products, setProducts] = useState([])
  
  // Form State
  const [selectedItemId, setSelectedItemId] = useState('')
  const [wasteQty, setWasteQty] = useState('')
  const [reason, setReason] = useState('')

  const toast = useToast()

  // 1. Fetch Both Inventories
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch Raw Materials
        const rawSnap = await getDocs(collection(db, "raw_materials"))
        const rawList = []
        rawSnap.forEach(d => rawList.push({ id: d.id, ...d.data() }))
        setRawMaterials(rawList)

        // Fetch Finished Goods
        const prodSnap = await getDocs(collection(db, "inventory"))
        const prodList = []
        prodSnap.forEach(d => prodList.push({ id: d.id, ...d.data() }))
        setProducts(prodList)

      } catch (error) {
        toast({ title: "Error loading data", status: "error" })
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  // 2. Report the Loss 📉
  const handleReportWaste = async () => {
    if (!selectedItemId || !wasteQty || !reason) {
      toast({ title: "Please fill all fields", status: "warning" })
      return
    }

    const qty = parseFloat(wasteQty)
    if (qty <= 0) return

    try {
      let item = null
      let collectionName = ''
      let costPerUnit = 0
      
      // A. Identify Item & Cost
      if (inventoryType === 'raw') {
        item = rawMaterials.find(i => i.id === selectedItemId)
        collectionName = 'raw_materials'
        costPerUnit = item.averageCost || 0
      } else {
        item = products.find(i => i.id === selectedItemId)
        collectionName = 'inventory'
        costPerUnit = item.averageUnitCost || 0
      }

      const totalValueLost = qty * costPerUnit

      // B. Deduct Stock
      const itemRef = doc(db, collectionName, selectedItemId)
      await updateDoc(itemRef, { currentStock: increment(-qty) })

      // C. Record Financial Loss (As an Expense) 💸
      await addDoc(collection(db, "expenses"), {
        description: `Wastage: ${item.name} (${reason})`,
        amount: totalValueLost,
        category: "Wastage/Loss", // Special Category
        date: serverTimestamp(),
        user: "Admin",
        type: "Loss"
      })

      // D. Log for Audit
      await logAction('Admin', 'Reported Waste', `Wrote off ${qty} ${item.unit || 'units'} of ${item.name}. Value: TZS ${Math.round(totalValueLost)}`)

      toast({ 
        title: "Loss Recorded", 
        description: `Stock deducted & TZS ${Math.round(totalValueLost).toLocaleString()} recorded as loss.`, 
        status: "success" 
      })

      // Reset Form
      setWasteQty('')
      setReason('')
      setSelectedItemId('')

    } catch (error) {
      console.error(error)
      toast({ title: "Error reporting waste", status: "error" })
    }
  }

  if (loading) return <Box p={10} textAlign="center"><Spinner size="xl" /></Box>

  return (
    <Box p={4} maxW="600px" mx="auto">
      <HStack mb={6}>
        <Button onClick={onBack} variant="ghost">← Back</Button>
        <Heading size="md" color="red.600">Report Damages / Waste 🗑️</Heading>
      </HStack>

      <Box bg="white" p={6} borderRadius="xl" shadow="md">
        <VStack spacing={6} align="stretch">
          
          <Alert status="warning" borderRadius="md">
            <AlertIcon />
            Warning: This will permanently remove stock and deduct the value from your Net Profit.
          </Alert>

          {/* 1. Select Type */}
          <Box>
            <Text mb={2} fontWeight="bold">What was damaged?</Text>
            <RadioGroup onChange={setInventoryType} value={inventoryType}>
              <Stack direction="row" spacing={5}>
                <Radio value="raw" colorScheme="orange">Raw Material (Ingredient)</Radio>
                <Radio value="product" colorScheme="purple">Finished Product (Jar)</Radio>
              </Stack>
            </RadioGroup>
          </Box>

          {/* 2. Select Item */}
          <Box>
            <Text mb={2} fontWeight="bold">Select Item</Text>
            <Select placeholder="Choose item..." value={selectedItemId} onChange={(e) => setSelectedItemId(e.target.value)}>
              {inventoryType === 'raw' 
                ? rawMaterials.map(m => <option key={m.id} value={m.id}>{m.name} (Current: {m.currentStock})</option>)
                : products.map(p => <option key={p.id} value={p.id}>{p.name} (Current: {p.currentStock})</option>)
              }
            </Select>
          </Box>

          {/* 3. Quantity & Reason */}
          <HStack align="end">
            <Box flex={1}>
              <Text mb={2} fontWeight="bold">Quantity Lost</Text>
              <Input type="number" placeholder="0" value={wasteQty} onChange={(e) => setWasteQty(e.target.value)} />
            </Box>
            <Box flex={2}>
              <Text mb={2} fontWeight="bold">Reason</Text>
              <Input placeholder="e.g. Burnt, Dropped, Expired" value={reason} onChange={(e) => setReason(e.target.value)} />
            </Box>
          </HStack>

          {/* Submit Button */}
          <Button colorScheme="red" size="lg" onClick={handleReportWaste}>
            Confirm Loss
          </Button>

        </VStack>
      </Box>
    </Box>
  )
}