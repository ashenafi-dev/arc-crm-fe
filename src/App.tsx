import { Toaster } from 'react-hot-toast'
import { AuthProvider } from '@/context/AuthContext'
import { AppRoutes } from '@/routes'

function App() {
  return (
    <AuthProvider>
      <Toaster position="bottom-right" gutter={10} containerStyle={{ bottom: 20, right: 20 }} />
      <AppRoutes />
    </AuthProvider>
  )
}

export default App
