// src/components/ExpensesScreen.jsx
import { useState, useEffect } from 'react'
import { Box, Button, Table, Thead, Tbody, Tr, Th, Td, Heading, HStack, Input, Select, useToast, Spinner, Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalFooter, useDisclosure, VStack, Text, Badge } from '@chakra-ui/react'
import { collection, getDocs, addDoc, serverTimestamp, query, orderBy, limit } from 'firebase/firestore'
import { db } from '../firebase'
import { logAction } from '../utils/logger'

export default function ExpensesScreen({ onBack }) {
  const [expenses, setExpenses] = useState([])
  const [loading, setLoading] = useState(true)
  const { isOpen, onOpen, onClose } = useDisclosure()
  
  // Form State
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState('')

  const toast = useToast()

  const categories = [
    "Rent",
    "Utilities (Electricity/Water)",
    "Transport",
    "Marketing",
    "Salaries",
    "Packaging",
    "Repairs",
    "Other"
  ]

  // 1. Fetch Expenses
  useEffect(() => {
    fetchExpenses()
  }, [])

  const fetchExpenses = async () => {
    try {
      // Get last 50 expenses, newest first
      const q = query(collection(db, "expenses"), orderBy("date", "desc"), limit(50))
      const querySnapshot = await getDocs(q)
      const items = []
      querySnapshot.forEach((doc) => {
        items.push({ id: doc.id, ...doc.data() })
      })
      setExpenses(items)
    } catch (error) {
      toast({ title: "Error loading expenses", status: "error" })
    } finally {
      setLoading(false)
    }
  }

  // 2. Add New Operating Expense 💸
  const handleAddExpense = async () => {
    if (!description || !amount || !category) {
      toast({ title: "Please fill all fields", status: "warning" })
      return
    }

    try {
      const expenseAmount = parseFloat(amount)

      await addDoc(collection(db, "expenses"), {
        description,
        amount: expenseAmount,
        category,
        date: serverTimestamp(),
        user: "Admin",
        type: "Operating" // Tag it so we know it's not a Raw Material Purchase
      })

      await logAction('Admin', 'Expense Logged', `Paid TZS ${expenseAmount.toLocaleString()} for ${category} (${description})`)

      toast({ title: "Expense Recorded", status: "success" })
      
      setDescription('')
      setAmount('')
      setCategory('')
      onClose()
      fetchExpenses()

    } catch (error) {
      console.error(error)
      toast({ title: "Error saving expense", status: "error" })
    }
  }

  // Helper to color code categories
  const getBadgeColor = (cat) => {
    if (cat === 'Raw Materials') return 'blue'
    if (cat === 'Salaries') return 'purple'
    if (cat === 'Rent') return 'red'
    return 'gray'
  }

  if (loading) return <Box p={10} textAlign="center"><Spinner size="xl" /></Box>

  return (
    <Box p={4} maxW="1000px" mx="auto">
      <HStack mb={6} justifyContent="space-between">
        <HStack>
          <Button onClick={onBack} variant="ghost">← Back</Button>
          <Heading size="md" color="red.600">Expenses & Overhead 📉</Heading>
        </HStack>
        <Button colorScheme="red" onClick={onOpen}>+ Record Expense</Button>
      </HStack>

      <Box bg="white" shadow="md" borderRadius="xl" overflow="hidden">
        <Table variant="simple">
          <Thead bg="gray.100">
            <Tr>
              <Th>Date</Th>
              <Th>Description</Th>
              <Th>Category</Th>
              <Th isNumeric>Amount (TZS)</Th>
            </Tr>
          </Thead>
          <Tbody>
            {expenses.map((exp) => (
              <Tr key={exp.id} _hover={{ bg: "gray.50" }}>
                <Td fontSize="sm" color="gray.500">
                  {exp.date?.toDate().toLocaleDateString()}
                </Td>
                <Td fontWeight="medium">{exp.description}</Td>
                <Td>
                  <Badge colorScheme={getBadgeColor(exp.category)}>{exp.category}</Badge>
                </Td>
                <Td isNumeric fontWeight="bold" color="red.500">
                  - {exp.amount?.toLocaleString()}
                </Td>
              </Tr>
            ))}
            {expenses.length === 0 && (
              <Tr><Td colSpan={4} textAlign="center" py={10}>No expenses recorded yet.</Td></Tr>
            )}
          </Tbody>
        </Table>
      </Box>

      {/* Add Expense Modal */}
      <Modal isOpen={isOpen} onClose={onClose} isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Record Operating Expense</ModalHeader>
          <ModalBody>
            <VStack spacing={4}>
              <Box w="100%">
                <Text mb={2} fontWeight="bold">Description</Text>
                <Input placeholder="e.g. Paid Luku Token" value={description} onChange={(e) => setDescription(e.target.value)} />
              </Box>

              <Box w="100%">
                <Text mb={2} fontWeight="bold">Category</Text>
                <Select placeholder="Select Category" value={category} onChange={(e) => setCategory(e.target.value)}>
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </Select>
              </Box>

              <Box w="100%">
                <Text mb={2} fontWeight="bold">Amount (TZS)</Text>
                <Input type="number" placeholder="e.g. 50000" value={amount} onChange={(e) => setAmount(e.target.value)} />
              </Box>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onClose}>Cancel</Button>
            <Button colorScheme="red" onClick={handleAddExpense}>Save Expense</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  )
}