// src/components/NetworkStatus.jsx
import { useState, useEffect } from 'react'
import { Box, Text, HStack, Slide } from '@chakra-ui/react'

export default function NetworkStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine)

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  if (isOnline) return null // Hide if everything is fine

  return (
    <Box 
      position="fixed" 
      bottom="0" 
      left="0" 
      right="0" 
      bg="red.600" 
      color="white" 
      p={2} 
      textAlign="center" 
      zIndex={9999}
      shadow="lg"
    >
      <HStack justifyContent="center">
        <Text fontSize="xl">📡</Text>
        <Text fontWeight="bold">You are currently OFFLINE</Text>
        <Text fontSize="sm">(Data is saving to device and will sync later)</Text>
      </HStack>
    </Box>
  )
}