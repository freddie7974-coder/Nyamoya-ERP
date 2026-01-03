// src/components/BalanceSheetScreen.jsx
import { useState, useEffect } from 'react'
import {
  Box, Heading, SimpleGrid, Stat, StatLabel, StatNumber, StatHelpText,
  Button, VStack, HStack, Input, FormControl, FormLabel, Divider, Text,
  Container, Card, CardHeader, CardBody, useToast, Spinner
} from '@chakra-ui/react'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '../firebase'

export default function BalanceSheetScreen({ onBack }) {
  const [loading, setLoading] = useState(true)

  // ASSETS
  const [cash, setCash] = useState(0) // User Input
  const [bank, setBank] = useState(0) // User Input
  const [rawMaterialValue, setRawMaterialValue] = useState(0) // Auto from DB
  const [finishedGoodsValue, setFinishedGoodsValue] = useState(0) // Auto from DB
  const [fixedAssets, setFixedAssets] = useState(0) // Machinery (User Input)

  // LIABILITIES
  const [accountsPayable, setAccountsPayable] = useState(0) // Debts to suppliers
  const [loans, setLoans] = useState(0) // Bank loans

  // EQUITY
  const [ownerCapital, setOwnerCapital] = useState(0) // Money you put in

  const toast = useToast()

  // 1. Fetch Inventory Value Automatically
  useEffect(() => {
    calculateInventoryValue()
  }, [])

  const calculateInventoryValue = async () => {
    try {
      // A. Raw Materials
      const rawSnap = await getDocs(collection(db, "raw_materials"))
      let rawTotal = 0
      rawSnap.forEach(doc => {
        const data = doc.data()
        // Value = Quantity * Cost Per Unit
        const val = (parseFloat(data.currentStock) || 0) * (parseFloat(data.averageCost) || 0)
        rawTotal += val
      })
      setRawMaterialValue(rawTotal)

      // B. Finished Goods
      const prodSnap = await getDocs(collection(db, "inventory"))
      let prodTotal = 0
      prodSnap.forEach(doc => {
        const data = doc.data()
        
        // ✅ FIXED LOGIC HERE:
        // 1. Try 'averageUnitCost' (Real Production Cost)
        // 2. Try 'costPerUnit' (Manual Entry)
        // 3. Fallback to 60% of Selling Price (Estimate)
        const cost = data.averageUnitCost || data.costPerUnit || (data.price * 0.6) || 0
        
        const val = (parseFloat(data.currentStock) || 0) * cost
        prodTotal += val
      })
      setFinishedGoodsValue(prodTotal)

    } catch (error) {
      console.error(error)
      toast({ title: "Error calculating inventory", status: "error" })
    } finally {
      setLoading(false)
    }
  }

  // CALCULATIONS
  const totalCurrentAssets = parseFloat(cash) + parseFloat(bank) + rawMaterialValue + finishedGoodsValue
  const totalFixedAssets = parseFloat(fixedAssets)
  const TOTAL_ASSETS = totalCurrentAssets + totalFixedAssets

  const TOTAL_LIABILITIES = parseFloat(accountsPayable) + parseFloat(loans)

  // The "Plug" Figure: Assets - Liabilities - Initial Capital = Profit kept in business
  const RETAINED_EARNINGS = TOTAL_ASSETS - TOTAL_LIABILITIES - parseFloat(ownerCapital)

  const TOTAL_EQUITY = parseFloat(ownerCapital) + RETAINED_EARNINGS

  if (loading) return <Box p={10} textAlign="center"><Spinner size="xl" /></Box>

  return (
    <Box p={4} maxW="900px" mx="auto">
      <Button onClick={onBack} mb={6}>← Back to Dashboard</Button>
      
      <Heading mb={2} color="teal.700">Balance Sheet ⚖️</Heading>
      <Text color="gray.500" mb={8}>Snapshot of Company Financial Health</Text>

      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={8} mb={10}>
        
        {/* LEFT SIDE: ASSETS (What you HAVE) */}
        <VStack spacing={4} align="stretch">
          <Heading size="md" color="green.600" borderBottom="2px solid" borderColor="green.200" pb={2}>
            ASSETS (What we Own)
          </Heading>

          <Box bg="white" p={4} borderRadius="md" shadow="sm">
            <Text fontWeight="bold" mb={2}>Current Assets</Text>
            
            <FormControl mb={2}>
              <FormLabel fontSize="sm">Cash in Hand (TZS)</FormLabel>
              <Input type="number" value={cash} onChange={(e) => setCash(e.target.value)} />
            </FormControl>

            <FormControl mb={2}>
              <FormLabel fontSize="sm">Bank Balance (TZS)</FormLabel>
              <Input type="number" value={bank} onChange={(e) => setBank(e.target.value)} />
            </FormControl>

            <HStack justifyContent="space-between" py={2} borderTop="1px dashed gray">
              <Text fontSize="sm">Raw Materials Inventory</Text>
              <Text fontWeight="bold">{rawMaterialValue.toLocaleString()}</Text>
            </HStack>

            <HStack justifyContent="space-between" py={2}>
              <Text fontSize="sm">Finished Goods Inventory</Text>
              <Text fontWeight="bold">{finishedGoodsValue.toLocaleString()}</Text>
            </HStack>
          </Box>

          <Box bg="white" p={4} borderRadius="md" shadow="sm">
            <Text fontWeight="bold" mb={2}>Fixed Assets</Text>
            <FormControl>
              <FormLabel fontSize="sm">Machinery & Equipment Value</FormLabel>
              <Input type="number" value={fixedAssets} onChange={(e) => setFixedAssets(e.target.value)} />
            </FormControl>
          </Box>

          <Box bg="green.50" p={4} borderRadius="md" border="1px solid" borderColor="green.300">
            <HStack justifyContent="space-between">
              <Heading size="sm" color="green.800">TOTAL ASSETS</Heading>
              <Heading size="md" color="green.800">TZS {TOTAL_ASSETS.toLocaleString()}</Heading>
            </HStack>
          </Box>
        </VStack>

        {/* RIGHT SIDE: LIABILITIES & EQUITY (Who owns it) */}
        <VStack spacing={4} align="stretch">
          <Heading size="md" color="red.600" borderBottom="2px solid" borderColor="red.200" pb={2}>
            LIABILITIES & EQUITY
          </Heading>

          <Box bg="white" p={4} borderRadius="md" shadow="sm">
            <Text fontWeight="bold" mb={2}>Liabilities (What we Owe)</Text>
            
            <FormControl mb={2}>
              <FormLabel fontSize="sm">Accounts Payable (Supplier Debt)</FormLabel>
              <Input type="number" value={accountsPayable} onChange={(e) => setAccountsPayable(e.target.value)} />
            </FormControl>

            <FormControl>
              <FormLabel fontSize="sm">Loans / Other Debts</FormLabel>
              <Input type="number" value={loans} onChange={(e) => setLoans(e.target.value)} />
            </FormControl>

            <HStack justifyContent="space-between" mt={4} pt={2} borderTop="1px solid gray">
               <Text fontWeight="bold">Total Liabilities</Text>
               <Text fontWeight="bold" color="red.500">{TOTAL_LIABILITIES.toLocaleString()}</Text>
            </HStack>
          </Box>

          <Box bg="white" p={4} borderRadius="md" shadow="sm">
            <Text fontWeight="bold" mb={2}>Equity (Owner's Value)</Text>
            
            <FormControl mb={2}>
              <FormLabel fontSize="sm">Owner's Capital (Initial Investment)</FormLabel>
              <Input type="number" value={ownerCapital} onChange={(e) => setOwnerCapital(e.target.value)} />
            </FormControl>

            <Box bg="yellow.50" p={3} borderRadius="md" mt={2}>
              <HStack justifyContent="space-between">
                <Text fontSize="sm">Retained Earnings (Calc.)</Text>
                <Text fontWeight="bold" color={RETAINED_EARNINGS >= 0 ? "green.600" : "red.600"}>
                  {RETAINED_EARNINGS.toLocaleString()}
                </Text>
              </HStack>
              <Text fontSize="xs" color="gray.500">(Assets - Liabilities - Capital)</Text>
            </Box>
          </Box>

          <Box bg="red.50" p={4} borderRadius="md" border="1px solid" borderColor="red.300">
            <HStack justifyContent="space-between">
              <Heading size="sm" color="red.800">TOTAL LIAB. + EQUITY</Heading>
              <Heading size="md" color="red.800">TZS {(TOTAL_LIABILITIES + TOTAL_EQUITY).toLocaleString()}</Heading>
            </HStack>
          </Box>
        </VStack>

      </SimpleGrid>

      {/* BALANCE CHECK */}
      <Box textAlign="center" p={4} bg={TOTAL_ASSETS === (TOTAL_LIABILITIES + TOTAL_EQUITY) ? "teal.50" : "red.100"} borderRadius="xl">
         <Heading size="sm" mb={1}>Balance Check</Heading>
         {TOTAL_ASSETS === (TOTAL_LIABILITIES + TOTAL_EQUITY) ? (
            <Text color="teal.600" fontWeight="bold">✅ The Sheet Balances perfectly!</Text>
         ) : (
            <Text color="red.600">❌ Calculation Error (Assets != Liab + Equity)</Text>
         )}
      </Box>

    </Box>
  )
}