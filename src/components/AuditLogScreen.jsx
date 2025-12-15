// src/components/AuditLogScreen.jsx
import { useState, useEffect } from 'react'
import { Box, Button, Heading, HStack, Badge, Spinner, Table, Thead, Tbody, Tr, Th, Td, TableContainer } from '@chakra-ui/react'
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore'
import { db } from '../firebase'

export default function AuditLogScreen({ onBack }) {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const q = query(collection(db, "audit_logs"), orderBy("timestamp", "desc"), limit(50))
        const querySnapshot = await getDocs(q)
        const items = []
        querySnapshot.forEach((doc) => {
          items.push({ id: doc.id, ...doc.data() })
        })
        setLogs(items)
      } catch (error) {
        console.error("Error fetching logs:", error)
      } finally {
        setLoading(false)
      }
    }
    fetchLogs()
  }, [])

  if (loading) return <Box p={10} textAlign="center"><Spinner size="xl" /></Box>

  return (
    <Box p={4} maxW="900px" mx="auto">
      <HStack mb={6}>
        <Button onClick={onBack} variant="ghost">← Back</Button>
        <Heading size="md" color="gray.700">System Audit Trail 🛡️</Heading>
      </HStack>

      <Box borderWidth="1px" borderRadius="xl" bg="white" shadow="md" overflow="hidden">
        <TableContainer>
          <Table variant="simple" size="sm">
            <Thead bg="gray.100">
              <Tr>
                <Th>Time</Th>
                <Th>User</Th>
                <Th>Action</Th>
                <Th>Details</Th>
              </Tr>
            </Thead>
            <Tbody>
              {logs.map((log) => (
                <Tr key={log.id} _hover={{ bg: "gray.50" }}>
                  <Td fontSize="xs" color="gray.500">
                    {log.timestamp?.toDate().toLocaleString() || 'Just now'}
                  </Td>
                  <Td>
                    <Badge colorScheme={log.user === 'Admin' ? 'purple' : 'orange'}>
                      {log.user}
                    </Badge>
                  </Td>
                  <Td fontWeight="bold">{log.action}</Td>
                  <Td fontSize="sm" color="gray.600">{log.details}</Td>
                </Tr>
              ))}
              {logs.length === 0 && (
                <Tr><Td colSpan={4} textAlign="center" py={4}>No logs recorded yet.</Td></Tr>
              )}
            </Tbody>
          </Table>
        </TableContainer>
      </Box>
    </Box>
  )
}