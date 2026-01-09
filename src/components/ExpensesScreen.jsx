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
  const [category, setCategory] = useState('Operating') // Operating, Raw Material, Salary, Other
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]) // Default to today
  const [isSubmitting, setIsSubmitting] = useState(false)

  const toast = useToast()

  // 1. Fetch Expenses
  useEffect(() => {
    fetchExpenses()
  }, [])

  const fetchExpenses = async () => {
    setLoading(true)
    try {
      // Get expenses ordered by date (newest first)
      const q = query(collection(db, 'expenses'), orderBy('date', 'desc'))
      const snapshot = await getDocs(q)
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
      setExpenses(data)
    } catch (error) {
      console.error("Error loading expenses:", error)
      toast({ title: "Error loading data", status: "error" })
    } finally {
      setLoading(false)
    }
  }

  // 2. Add Expense
  const handleAddExpense = async () => {
    if (!amount || !description) {
      toast({ title: "Please fill in amount and description", status: "warning" })
      return
    }

    setIsSubmitting(true)
    try {
      const newExpense = {
        amount: Number(amount),
        description,
        category,
        date, // Uses the date picker value
        timestamp: serverTimestamp(),
        type: 'expense' // vital for analytics
      }

      await addDoc(collection(db, 'expenses'), newExpense)
      
      toast({ title: "Expense Recorded", status: "success" })
      
      // Reset Form
      setAmount('')
      setDescription('')
      setCategory('Operating')
      
      // Refresh List
      fetchExpenses()

    } catch (error) {
      console.error(error)
      toast({ title: "Failed to save", status: "error" })
    } finally {
      setIsSubmitting(false)
    }
  }

  // 3. Delete Expense
  const handleDelete = async (id) => {
    if(!window.confirm("Are you sure you want to delete this expense?")) return
    
    try {
      await deleteDoc(doc(db, 'expenses', id))
      setExpenses(expenses.filter(e => e.id !== id))
      toast({ title: "Deleted", status: "info" })
    } catch (error) {
      console.error(error)
      toast({ title: "Delete failed", status: "error" })
    }
  }

  return (
    <Box p={5} maxW="1200px" mx="auto">
      {/* Header */}
      <HStack mb={6}>
        <ArrowBackIcon 
            boxSize={6} 
            color="gray.500" 
            cursor="pointer" 
            onClick={onBack} 
            _hover={{ color: "teal.600" }}
        />
        <Heading size="lg" color="red.700">Expense Tracker</Heading>
      </HStack>

      <HStack alignItems="flex-start" spacing={8} flexDirection={{ base: 'column', md: 'row' }}>
        
        {/* LEFT: Add New Expense Form */}
        <Card w={{ base: "100%", md: "40%" }} variant="outline" boxShadow="md">
          <CardBody>
            <Heading size="md" mb={4} color="gray.600">Record Spending</Heading>
            
            <VStack spacing={4}>
              <FormControl>
                <FormLabel>Amount (TZS)</FormLabel>
                <Input 
                    type="number" 
                    placeholder="e.g. 50000" 
                    value={amount} 
                    onChange={(e) => setAmount(e.target.value)} 
                    fontWeight="bold"
                    color="red.600"
                />
              </FormControl>

              <FormControl>
                <FormLabel>Description</FormLabel>
                <Input 
                    placeholder="e.g. Paid Electricity (LUKU)" 
                    value={description} 
                    onChange={(e) => setDescription(e.target.value)} 
                />
              </FormControl>

              <FormControl>
                <FormLabel>Category</FormLabel>
                <Select value={category} onChange={(e) => setCategory(e.target.value)}>
                    <option value="Operating">Operating (Rent, Electricity, Water)</option>
                    <option value="Raw Materials">Raw Materials (Emergency Purchase)</option>
                    <option value="Salary">Staff Salary / Owner Draw</option>
                    <option value="Transport">Transport / Delivery</option>
                    <option value="Maintenance">Repairs & Maintenance</option>
                    <option value="Other">Other</option>
                </Select>
              </FormControl>

              <FormControl>
                <FormLabel>Date Spent</FormLabel>
                <Input 
                    type="date" 
                    value={date} 
                    onChange={(e) => setDate(e.target.value)} 
                />
              </FormControl>

              <Button 
                colorScheme="red" 
                w="100%" 
                onClick={handleAddExpense} 
                isLoading={isSubmitting}
              >
                Save Expense
              </Button>
            </VStack>
          </CardBody>
        </Card>

        {/* RIGHT: History List */}
        <Box w={{ base: "100%", md: "60%" }}>
          <Heading size="md" mb={4} color="gray.600">Recent Expenses</Heading>
          
          {loading ? (
             <Spinner color="red.500" />
          ) : (
            <Box overflowX="auto">
              <Table variant="simple" size="sm">
                <Thead>
                  <Tr>
                    <Th>Date</Th>
                    <Th>Details</Th>
                    <Th isNumeric>Amount</Th>
                    <Th></Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {expenses.length === 0 ? (
                    <Tr><Td colSpan={4} textAlign="center">No expenses recorded yet.</Td></Tr>
                  ) : expenses.map((exp) => (
                    <Tr key={exp.id}>
                      <Td>{exp.date}</Td>
                      <Td>
                        <Text fontWeight="bold" fontSize="sm">{exp.description}</Text>
                        <Badge colorScheme={exp.category === 'Raw Materials' ? 'orange' : 'gray'} fontSize="xs">
                            {exp.category}
                        </Badge>
                      </Td>
                      <Td isNumeric fontWeight="bold" color="red.600">
                        {Number(exp.amount).toLocaleString()}
                      </Td>
                      <Td>
                        <IconButton 
                            icon={<DeleteIcon />} 
                            size="xs" 
                            colorScheme="red" 
                            variant="ghost" 
                            onClick={() => handleDelete(exp.id)}
                        />
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </Box>
          )}
        </Box>

      </HStack>
    </Box>
  )
}