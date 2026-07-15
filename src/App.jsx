import { useState } from 'react'
import { GoogleOAuthProvider } from '@react-oauth/google'
import Login from './components/Login'
import LandingPage from './components/LandingPage'

const GOOGLE_CLIENT_ID = '437706053296-at9fp70tu0t03c4e5e991up6tkk9o6vb.apps.googleusercontent.com'

function App() {
  const [user, setUser] = useState(null)

  const handleLoginSuccess = (userInfo) => setUser(userInfo)
  const handleLogout = () => setUser(null)

  if (!user) {
    return (
      <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
        <Login onLoginSuccess={handleLoginSuccess} />
      </GoogleOAuthProvider>
    )
  }

  return <LandingPage user={user} onLogout={handleLogout} />
}

export default App
