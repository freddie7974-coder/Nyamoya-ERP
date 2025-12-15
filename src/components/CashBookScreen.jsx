// src/components/CashBookScreen.jsx
import { useState, useEffect } from 'react'
import { Box, Button, VStack, Heading, HStack, Text, Table, Thead, Tbody, Tr, Th, Td, Badge, Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalCloseButton, useDisclosure, Input, useToast, Spinner } from '@chakra-ui/react'
import { collection, getDocs, addDoc, serverTimestamp, query, orderBy } from 'firebase/firestore'
import { db } from '../firebase'

export default function CashBookScreen({ onBack }) {
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [totalBalance, setTotalBalance] = useState(0)
  
  // For adding Capital
  const { isOpen, onOpen, onClose } = useDisclosure()
  const [capitalAmount, setCapitalAmount] = useState('')
  const [capitalNote, setCapitalNote] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const toast = useToast()

  // 1. FETCH EVERYTHING (The "Mixer")
  const fetchData = async () => {
    setLoading(true)
    try {
      const allData = []

      // A. Get Sales (Money In)
      const salesSnap = await getDocs(collection(db, "sales"))
      salesSnap.forEach(doc => {
        allData.push({ 
          id: doc.id, 
          type: 'sale', 
          amount: doc.data().totalAmount, 
          desc: `Sale (${doc.data().itemCount} items)`, 
          date: doc.data().date ? doc.data().date.toDate() : new Date(),
          isCredit: true // Money In
        })
      })

      // B. Get Expenses (Money Out)
      const expensesSnap = await getDocs(collection(db, "expenses"))
      expensesSnap.forEach(doc => {
        allData.push({ 
          id: doc.id, 
          type: 'expense', 
          amount: doc.data().amount, 
          desc: doc.data().description, 
          date: doc.data().date ? doc.data().date.toDate() : new Date(),
          isCredit: false // Money Out
        })
      })

      // C. Get Capital (Money In)
      const capitalSnap = await getDocs(collection(db, "capital"))
      capitalSnap.forEach(doc => {
        allData.push({ 
          id: doc.id, 
          type: 'capital', 
          amount: doc.data().amount, 
          desc: `Capital: ${doc.data().note}`, 
          date: doc.data().date ? doc.data().date.toDate() : new Date(),
          isCredit: true // Money In
        })
      })

      // D. Sort by Date (Newest first)
      allData.sort((a, b) => b.date - a.date)
      setTransactions(allData)

      // E. Calculate Total Balance
      const balance = allData.reduce((acc, item) => {
        return item.isCredit ? acc + item.amount : acc - item.amount
      }, 0)
      setTotalBalance(balance)

    } catch (error) {
      console.error("Error fetching cash book:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  // 2. Logic to Add Capital
  const handleAddCapital = async () => {
    if (!capitalAmount) return
    setIsSubmitting(true)
    try {
      await addDoc(collection(db, "capital"), {
        amount: parseFloat(capitalAmount),
        note: capitalNote || "Capital Injection",
        date: serverTimestamp()
      })
      toast({ title: "Capital Added", status: "success" })
      setCapitalAmount('')
      setCapitalNote('')
      onClose()
      fetchData() // Refresh list
    } catch (error) {
      toast({ title: "Error", status: "error" })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loading) return <Box p={10} textAlign="center"><Spinner /></Box>

  return (
    <Box p={4} maxW="800px" mx="auto">
      <HStack justifyContent="space-between" mb={6}>
        <Button onClick={onBack} variant="ghost">← Back</Button>
        <Heading size="md">Cash Book</Heading>
        <Button colorScheme="blue" size="sm" onClick={onOpen}>+ Add Capital</Button>
      </HStack>

      {/* The Big Balance Card */}
      <Box bg="gray.800" color="white" p={6} borderRadius="xl" mb={6} textAlign="center">
        <Text fontSize="sm" color="gray.400">CURRENT BUSINESS BALANCE</Text>
        <Heading size="2xl" color={totalBalance >= 0 ? "green.300" : "red.300"}>
          TZS {totalBalance.toLocaleString()}
        </Heading>
      </Box>

      {/* The History Table */}
      <Box overflowX="auto">
        <Table variant="simple" size="sm">
          <Thead>
            <Tr>
              <Th>Date</Th>
              <Th>Description</Th>
              <Th isNumeric>Amount (TZS)</Th>
            </Tr>
          </Thead>
          <Tbody>
            {transactions.map((t) => (
              <Tr key={t.id}>
                <Td fontSize="xs">{t.date.toLocaleDateString()}</Td>
                <Td>
                  <Badge colorScheme={t.type === 'sale' ? 'green' : t.type === 'expense' ? 'red' : 'blue'} mr={2}>
                    {t.type}
                  </Badge>
                  <Text as="span" fontSize="sm">{t.desc}</Text>
                </Td>
                <Td isNumeric fontWeight="bold" color={t.isCredit ? "green.600" : "red.600"}>
                  {t.isCredit ? "+" : "-"} {t.amount.toLocaleString()}
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </Box>

      {/* Modal for Adding Capital */}
      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Inject Capital</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            <VStack spacing={4}>
              <Text fontSize="sm" color="gray.500">Add money to the business (Investment)</Text>
              <Input 
                placeholder="Amount (TZS)" 
                type="number" 
                value={capitalAmount}
                onChange={(e) => setCapitalAmount(e.target.value)}
              />
              <Input 
                placeholder="Source (e.g. Loan, Savings)" 
                value={capitalNote}
                onChange={(e) => setCapitalNote(e.target.value)}
              />
              <Button colorScheme="blue" w="100%" onClick={handleAddCapital} isLoading={isSubmitting}>
                Save Transaction
              </Button>
            </VStack>
          </ModalBody>
        </ModalContent>
      </Modal>
    </Box>
  )
}