// src/components/ExpenseScreen.jsx
import { useState, useEffect } from 'react'
import {
  Box, Button, VStack, HStack, Heading, Text, Input, Select,
  Table, Thead, Tbody, Tr, Th, Td, IconButton, useToast,
  Card, CardBody, FormControl, FormLabel, Spinner, Badge
} from '@chakra-ui/react'
import { DeleteIcon, ArrowBackIcon } from '@chakra-ui/icons'
import { collection, addDoc, getDocs, deleteDoc, doc, serverTimestamp, orderBy, query } from 'firebase/firestore'
import { db } from '../firebase'

export default function ExpenseScreen({ onBack }) {
  const [expenses, setExpenses] = useState([])
  const [loading, setLoading] = useState(true)
  
  // Form State
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('Operating') 
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]) 
  const [isSubmitting, setIsSubmitting] = useState(false)

  const toast = useToast()

  // 🛡️ SAFETY FUNCTION: Prevents the crash!
  const formatExpenseDate = (dateVal) => {
    if (!dateVal) return '-'
    // Handle Firestore Timestamp
    if (dateVal && typeof dateVal.seconds === 'number') {
      return new Date(dateVal.seconds * 1000).toLocaleDateString()
    }
    // Handle JS Date
    if (dateVal instanceof Date) return dateVal.toLocaleDateString()
    // Handle String
    return String(dateVal)
  }

  useEffect(() => {
    fetchExpenses()
  }, [])

  const fetchExpenses = async () => {
    setLoading(true)
    try {
      const q = query(collection(db, 'expenses'), orderBy('date', 'desc'))
      const snapshot = await getDocs(q)
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
      setExpenses(data)
    } catch (error) {
      console.error("Error loading expenses:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddExpense = async () => {
    if (!amount || !description) {
      toast({ title: "Please fill in fields", status: "warning" })
      return
    }
    setIsSubmitting(true)
    try {
      await addDoc(collection(db, 'expenses'), {
        amount: Number(amount),
        description: String(description),
        category,
        date, 
        timestamp: serverTimestamp(),
        type: 'expense'
      })
      toast({ title: "Saved!", status: "success" })
      setAmount('')
      setDescription('')
      fetchExpenses()
    } catch (error) {
      console.error(error)
      toast({ title: "Error saving", status: "error" })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (id) => {
    if(!window.confirm("Delete this?")) return
    try {
      await deleteDoc(doc(db, 'expenses', id))
      setExpenses(expenses.filter(e => e.id !== id))
    } catch (error) {
      console.error(error)
    }
  }

  return (
    <Box p={5} maxW="1200px" mx="auto">
      <HStack mb={6}>
        <ArrowBackIcon boxSize={6} cursor="pointer" onClick={onBack} />
        <Heading size="lg" color="red.700">Expense Tracker</Heading>
      </HStack>

      <HStack alignItems="flex-start" spacing={8} flexDirection={{ base: 'column', md: 'row' }}>
        <Card w={{ base: "100%", md: "40%" }} variant="outline">
          <CardBody>
            <VStack spacing={4}>
              <FormControl><FormLabel>Amount</FormLabel><Input type="number" value={amount} onChange={(e)=>setAmount(e.target.value)}/></FormControl>
              <FormControl><FormLabel>Description</FormLabel><Input value={description} onChange={(e)=>setDescription(e.target.value)}/></FormControl>
              <FormControl>
                <FormLabel>Category</FormLabel>
                <Select value={category} onChange={(e)=>setCategory(e.target.value)}>
                    <option value="Operating">Operating</option>
                    <option value="Raw Materials">Raw Materials</option>
                    <option value="Salary">Salary</option>
                    <option value="Transport">Transport</option>
                    <option value="Other">Other</option>
                </Select>
              </FormControl>
              <FormControl><FormLabel>Date</FormLabel><Input type="date" value={date} onChange={(e)=>setDate(e.target.value)}/></FormControl>
              <Button colorScheme="red" w="100%" onClick={handleAddExpense} isLoading={isSubmitting}>Save</Button>
            </VStack>
          </CardBody>
        </Card>

        <Box w={{ base: "100%", md: "60%" }}>
          {loading ? <Spinner /> : (
            <Table size="sm">
              <Thead><Tr><Th>Date</Th><Th>Desc</Th><Th isNumeric>Amount</Th><Th></Th></Tr></Thead>
              <Tbody>
                {expenses.map((exp) => (
                  <Tr key={exp.id}>
                    {/* ✅ THIS LINE PREVENTS THE CRASH */}
                    <Td>{formatExpenseDate(exp.date)}</Td>
                    <Td>{exp.description} <Badge>{exp.category}</Badge></Td>
                    <Td isNumeric>{Number(exp.amount).toLocaleString()}</Td>
                    <Td><IconButton icon={<DeleteIcon />} size="xs" colorScheme="red" variant="ghost" onClick={() => handleDelete(exp.id)}/></Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          )}
        </Box>
      </HStack>
    </Box>
  )
}