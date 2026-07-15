import { useState } from 'react'
import { GoogleLogin } from '@react-oauth/google'
import { jwtDecode } from 'jwt-decode'
import './Login.css'

const Login = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    setError('')
    if (username === 'recruiter' && password === 'recruit123') {
      onLoginSuccess({
        name: 'Recruiter',
        email: 'recruiter@ava.com',
        picture: 'https://ui-avatars.com/api/?name=Recruiter&size=80&background=003330&color=00E6D2',
        sub: 'recruiter-demo',
      })
    } else {
      setError('Invalid credentials. Use recruiter / recruit123')
    }
  }

  const handleGoogleSuccess = (credentialResponse) => {
    try {
      const decoded = jwtDecode(credentialResponse.credential)
      onLoginSuccess({ name: decoded.name, email: decoded.email, picture: decoded.picture, sub: decoded.sub })
    } catch (err) {
      console.error('Google login error:', err)
    }
  }

  return (
    <div className="rlogin-fullscreen">
      <div className="rlogin-center">

        {/* Brand */}
        <div className="rlogin-brand">
          <img src="/assets/ava-logo.png" alt="AVA" className="rlogin-logo" />
          <div className="rlogin-brand-name">AVA</div>
          <div className="rlogin-brand-sub">RECRUITER INTELLIGENCE PLATFORM</div>
        </div>

        {/* Card */}
        <div className="rlogin-card">
          <div className="rlogin-card-header">
            <h2>Recruiter Sign In</h2>
            <p>Access your talent intelligence dashboard</p>
          </div>

          <form className="rlogin-form" onSubmit={handleSubmit}>
            <div className="rlogin-field">
              <label htmlFor="r-username">Username</label>
              <input
                id="r-username"
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="Enter username"
                required
              />
            </div>
            <div className="rlogin-field">
              <label htmlFor="r-password">Password</label>
              <input
                id="r-password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Enter password"
                required
              />
            </div>
            {error && <div className="rlogin-error">{error}</div>}
            <div className="rlogin-btn-row">
              <button type="submit" className="rlogin-btn">Sign In</button>
            </div>
            <p className="rlogin-hint">
              Demo: <strong>recruiter</strong> / <strong>recruit123</strong>
            </p>
          </form>

          <div className="rlogin-divider"><span>OR</span></div>

          <div className="rlogin-google">
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={() => console.error('Google login failed')}
              theme="filled_blue"
              size="large"
              text="signin_with"
              shape="rectangular"
              width="100%"
            />
          </div>

          <div className="rlogin-footer">
            <p>By continuing you agree to AVA's <a href="#">Terms</a> &amp; <a href="#">Privacy Policy</a></p>
          </div>
        </div>

        {/* Trust row */}
        <div className="rlogin-trust">
          <span>🔒 Secure</span>
          <span>⚡ Fast</span>
          <span>🌟 Trusted</span>
        </div>

      </div>
    </div>
  )
}

export default Login
