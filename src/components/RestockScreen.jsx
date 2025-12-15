// src/components/RestockScreen.jsx
import { useState, useEffect } from 'react'
import { Box, Button, VStack, Heading, HStack, Text, Checkbox, Spinner, Alert, AlertIcon } from '@chakra-ui/react'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '../firebase'

export default function RestockScreen({ onBack }) {
  const [lowStockItems, setLowStockItems] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkStock = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "inventory"))
        const urgentItems = []
        
        querySnapshot.forEach((doc) => {
          const item = doc.data()
          // RULE: If stock is less than 10, add to list
          if (item.currentStock < 10) {
            urgentItems.push({ id: doc.id, ...item })
          }
        })
        setLowStockItems(urgentItems)
      } catch (error) {
        console.error("Error", error)
      } finally {
        setLoading(false)
      }
    }
    checkStock()
  }, [])

  if (loading) return <Box p={10} textAlign="center"><Spinner /></Box>

  return (
    <Box p={4} maxW="600px" mx="auto">
      <HStack mb={6}>
        <Button onClick={onBack} variant="ghost">← Back</Button>
        <Heading size="md" color="orange.600">Restock List 🛒</Heading>
      </HStack>

      <Text mb={4} color="gray.600">These items are running low (below 10 units).</Text>

      {lowStockItems.length === 0 ? (
        <Alert status="success" borderRadius="md">
          <AlertIcon />
          Great job! All stock levels are healthy.
        </Alert>
      ) : (
        <VStack align="stretch" spacing={3}>
          {lowStockItems.map((item) => (
            <Box key={item.id} p={4} borderWidth="1px" borderRadius="lg" bg="orange.50">
              <HStack justifyContent="space-between">
                <VStack align="start" spacing={0}>
                  <Text fontWeight="bold">{item.name}</Text>
                  <Text fontSize="sm" color="red.500">Only {item.currentStock} left!</Text>
                </VStack>
                <Checkbox colorScheme="green" size="lg">Bought</Checkbox>
              </HStack>
            </Box>
          ))}
        </VStack>
      )}
    </Box>
  )
}