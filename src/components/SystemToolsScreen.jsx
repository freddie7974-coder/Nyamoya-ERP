// src/components/SystemToolsScreen.jsx
import { useState } from 'react'
import { Box, Button, Heading, Text, VStack, useToast, Alert, AlertIcon, SimpleGrid, Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalFooter, useDisclosure, Input } from '@chakra-ui/react'
import { collection, getDocs, deleteDoc, doc, updateDoc, writeBatch } from 'firebase/firestore'
import { db } from '../firebase'

export default function SystemToolsScreen({ onBack }) {
  const [loading, setLoading] = useState(false)
  const toast = useToast()
  
  // Confirmation Modal State
  const { isOpen, onOpen, onClose } = useDisclosure()
  const [actionType, setActionType] = useState('') // 'wipe_data' or 'reset_stock'
  const [confirmText, setConfirmText] = useState('')

  // 1. 🧹 WIPE ALL TRANSACTION DATA (Keeps Products/Users)
  const handleWipeData = async () => {
    if (confirmText !== 'DELETE') {
      toast({ title: "Type DELETE to confirm", status: "warning" })
      return
    }
    
    setLoading(true)
    try {
      // List of collections to empty
      const collections = ["sales", "expenses", "production_logs", "wastage", "audit_logs", "delivery"]
      
      let deleteCount = 0
      const batch = writeBatch(db) // Batched writes for speed (limit 500 ops)
      
      // Note: Client-side deletion is slow for huge data, but fine for testing cleanup
      for (const colName of collections) {
        const snapshot = await getDocs(collection(db, colName))
        snapshot.forEach((document) => {
          deleteDoc(doc(db, colName, document.id))
          deleteCount++
        })
      }

      toast({ title: "System Cleaned! ✨", description: `Deleted ${deleteCount} test records.`, status: "success" })
      onClose()
      setConfirmText('')

    } catch (error) {
      console.error(error)
      toast({ title: "Error wiping data", status: "error" })
    } finally {
      setLoading(false)
    }
  }

  // 2. 📉 RESET STOCK TO ZERO (Start Fresh Count)
  const handleResetStock = async () => {
    if (confirmText !== 'RESET') {
      toast({ title: "Type RESET to confirm", status: "warning" })
      return
    }

    setLoading(true)
    try {
      // 1. Reset Raw Materials
      const rawSnap = await getDocs(collection(db, "raw_materials"))
      rawSnap.forEach((document) => {
         updateDoc(doc(db, "raw_materials", document.id), { currentStock: 0 })
      })

      // 2. Reset Products
      const prodSnap = await getDocs(collection(db, "inventory"))
      prodSnap.forEach((document) => {
         updateDoc(doc(db, "inventory", document.id), { currentStock: 0 })
      })

      toast({ title: "Inventory Reset to 0", status: "info" })
      onClose()
      setConfirmText('')

    } catch (error) {
      console.error(error)
      toast({ title: "Error resetting stock", status: "error" })
    } finally {
      setLoading(false)
    }
  }

  const openConfirm = (type) => {
    setActionType(type)
    setConfirmText('')
    onOpen()
  }

  return (
    <Box p={4} maxW="800px" mx="auto">
      <Button onClick={onBack} mb={6}>← Back to Dashboard</Button>
      <Heading mb={2} color="red.700">System Admin Tools 🛠️</Heading>
      <Text color="gray.500" mb={8}>Dangerous actions. Use with caution.</Text>

      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={8}>
        
        {/* CARD 1: GO LIVE (Wipe Data) */}
        <Box p={6} border="1px solid" borderColor="red.200" borderRadius="xl" bg="red.50">
          <Heading size="md" mb={2} color="red.600">🧹 Wipe Test Data</Heading>
          <Text fontSize="sm" mb={4} color="gray.700">
            Use this when you are finished testing and want to <b>"Go Live"</b>.
            <br/><br/>
            ✅ <b>Deletes:</b> Sales, Expenses, Production History, Wastage logs.
            <br/>
            🛡️ <b>Keeps:</b> Products, Raw Materials, Customers, Staff logins.
          </Text>
          <Button colorScheme="red" width="100%" onClick={() => openConfirm('wipe_data')}>
            Purge All History
          </Button>
        </Box>

        {/* CARD 2: RESET STOCK */}
        <Box p={6} border="1px solid" borderColor="orange.200" borderRadius="xl" bg="orange.50">
          <Heading size="md" mb={2} color="orange.600">0️⃣ Reset Inventory</Heading>
          <Text fontSize="sm" mb={4} color="gray.700">
            Sets the stock level of ALL items (Raw Materials & Products) to <b>Zero</b>.
            <br/><br/>
            Use this if your physical stock count doesn't match the "Test Data" numbers and you want to start counting from scratch.
          </Text>
          <Button colorScheme="orange" width="100%" onClick={() => openConfirm('reset_stock')}>
            Set Stock to Zero
          </Button>
        </Box>

      </SimpleGrid>

      {/* CONFIRMATION MODAL */}
      <Modal isOpen={isOpen} onClose={onClose} isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader color="red.600">⚠️ Are you absolutely sure?</ModalHeader>
          <ModalBody>
            <VStack spacing={4}>
              <Alert status="error">
                <AlertIcon />
                This action CANNOT be undone. The data will be lost forever.
              </Alert>
              <Text>
                To confirm, please type 
                <b> {actionType === 'wipe_data' ? 'DELETE' : 'RESET'} </b> 
                below:
              </Text>
              <Input 
                value={confirmText} 
                onChange={(e) => setConfirmText(e.target.value)} 
                placeholder={actionType === 'wipe_data' ? 'DELETE' : 'RESET'}
                borderColor="red.300"
                _hover={{ borderColor: 'red.500' }}
              />
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onClose}>Cancel</Button>
            <Button 
              colorScheme="red" 
              onClick={actionType === 'wipe_data' ? handleWipeData : handleResetStock}
              isLoading={loading}
              isDisabled={confirmText !== (actionType === 'wipe_data' ? 'DELETE' : 'RESET')}
            >
              Confirm & Execute
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  )
}