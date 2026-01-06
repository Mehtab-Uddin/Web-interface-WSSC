import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import { LogIn, Eye, EyeOff } from 'lucide-react';
import { Form, Button, Card, InputGroup } from 'react-bootstrap';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!email || !password) {
      toast.error('Please enter a valid credentials');
      return false;
    }

    setLoading(true);

    try {
      await login(email, password);
      toast.success('Login successful!');
      navigate('/');
    } catch (error) {
      // Check if it's an access denied error
      if (error.isAccessDenied || error.message === 'Access denied') {
        toast.error('Access denied');
      } else {
        // Invalid credentials error
        toast.error('Please enter a valid credentials');
      }
    } finally {
      setLoading(false);
    }
    
    return false;
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      backgroundColor: '#E8F0F8',
      backgroundImage: 'url(/logo-1.png)',
      backgroundSize: 'clamp(400px, 1100px, 100%) auto',
      backgroundPosition: 'left center',
      backgroundRepeat: 'no-repeat',
      padding: '20px'
    }}>
      {/* Background overlay */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'linear-gradient(135deg, rgba(232, 240, 248, 0.7) 0%, rgba(230, 242, 255, 0.7) 100%)',
        zIndex: 0
      }}></div>

      {/* Centered login form */}
      <div style={{ 
        position: 'relative', 
        zIndex: 1,
        width: '100%',
        maxWidth: '450px',
        padding: '0 10px'
      }}>
          <Card style={{
            width: '100%',
            borderRadius: '24px',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(255, 255, 255, 0.9) 100%)',
            backdropFilter: 'blur(20px) saturate(180%)',
            WebkitBackdropFilter: 'blur(20px) saturate(180%)',
            border: '1px solid rgba(255, 255, 255, 0.4)',
            overflow: 'hidden',
            transition: 'transform 0.3s ease, box-shadow 0.3s ease'
          }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-5px)';
              e.currentTarget.style.boxShadow = '0 25px 70px rgba(0, 0, 0, 0.35)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 20px 60px rgba(0, 0, 0, 0.3)';
            }}
            >
            <Card.Body className="p-5">
              <div className="text-center mb-5">
                <div
                  style={{
                    width: '90px',
                    height: '90px',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    borderRadius: '50%',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '24px',
                    boxShadow: '0 8px 20px rgba(102, 126, 234, 0.4)',
                    transition: 'transform 0.3s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'scale(1.05)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'scale(1)';
                  }}
                >
                  <LogIn size={42} color="white" strokeWidth={2.5} />
                </div>
                <h2 className="fw-bold mb-2" style={{ 
                  fontSize: '28px', 
                  color: '#1a1a1a',
                  letterSpacing: '-0.5px'
                }}>
                  WSSC Admin Portal
                </h2>
                <p className="mb-0" style={{ 
                  color: '#666666', 
                  fontSize: '15px',
                  fontWeight: '500'
                }}>
                  Sign in to continue
                </p>
              </div>

              <Form onSubmit={handleSubmit}>
                <Form.Group className="mb-4">
                  <Form.Label className="fw-semibold mb-2" style={{ 
                    color: '#333333',
                    fontSize: '14px',
                    letterSpacing: '0.3px'
                  }}>
                    Email Address
                  </Form.Label>
                  <Form.Control
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    style={{
                      padding: '14px 16px',
                      fontSize: '15px',
                      border: '2px solid rgba(102, 126, 234, 0.5)',
                      borderRadius: '12px',
                      transition: 'all 0.3s ease',
                      backgroundColor: '#ffffff',
                      color: '#333333',
                      boxShadow: '0 2px 8px rgba(102, 126, 234, 0.1)'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#667eea';
                      e.target.style.backgroundColor = '#ffffff';
                      e.target.style.boxShadow = '0 0 0 3px rgba(102, 126, 234, 0.2), 0 4px 12px rgba(102, 126, 234, 0.15)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = 'rgba(102, 126, 234, 0.5)';
                      e.target.style.backgroundColor = '#ffffff';
                      e.target.style.boxShadow = '0 2px 8px rgba(102, 126, 234, 0.1)';
                    }}
                  />
                </Form.Group>

                <Form.Group className="mb-4">
                  <Form.Label className="fw-semibold mb-2" style={{ 
                    color: '#333333',
                    fontSize: '14px',
                    letterSpacing: '0.3px'
                  }}>
                    Password
                  </Form.Label>
                  <InputGroup>
                    <Form.Control
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      style={{
                        padding: '14px 16px',
                        fontSize: '15px',
                        border: '2px solid rgba(102, 126, 234, 0.5)',
                        borderRight: 'none',
                        borderRadius: '12px 0 0 12px',
                        transition: 'all 0.3s ease',
                        backgroundColor: '#ffffff',
                        color: '#333333',
                        boxShadow: '0 2px 8px rgba(102, 126, 234, 0.1)'
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = '#667eea';
                        e.target.style.backgroundColor = '#ffffff';
                        e.target.style.boxShadow = '0 0 0 3px rgba(102, 126, 234, 0.2), 0 4px 12px rgba(102, 126, 234, 0.15)';
                        const inputGroup = e.target.closest('.input-group');
                        if (inputGroup) {
                          const textElement = inputGroup.querySelector('.input-group-text');
                          if (textElement) {
                            textElement.style.borderColor = '#667eea';
                            textElement.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.15)';
                          }
                        }
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = 'rgba(102, 126, 234, 0.5)';
                        e.target.style.backgroundColor = '#ffffff';
                        e.target.style.boxShadow = '0 2px 8px rgba(102, 126, 234, 0.1)';
                        const inputGroup = e.target.closest('.input-group');
                        if (inputGroup) {
                          const textElement = inputGroup.querySelector('.input-group-text');
                          if (textElement) {
                            textElement.style.borderColor = 'rgba(102, 126, 234, 0.5)';
                            textElement.style.boxShadow = 'none';
                          }
                        }
                      }}
                    />
                    <InputGroup.Text
                      onClick={() => setShowPassword(!showPassword)}
                      style={{
                        cursor: 'pointer',
                        backgroundColor: '#ffffff',
                        border: '2px solid rgba(102, 126, 234, 0.5)',
                        borderLeft: 'none',
                        borderRadius: '0 12px 12px 0',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '0 18px',
                        transition: 'all 0.3s ease',
                        boxShadow: '0 2px 8px rgba(102, 126, 234, 0.1)'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#f8f9fa';
                        e.currentTarget.style.boxShadow = '0 2px 8px rgba(102, 126, 234, 0.15)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = '#ffffff';
                        e.currentTarget.style.boxShadow = '0 2px 8px rgba(102, 126, 234, 0.1)';
                      }}
                    >
                      {showPassword ? (
                        <EyeOff size={20} color="#667eea" />
                      ) : (
                        <Eye size={20} color="#667eea" />
                      )}
                    </InputGroup.Text>
                  </InputGroup>
                </Form.Group>

                <Button
                  type="submit"
                  variant="primary"
                  className="w-100"
                  disabled={loading}
                  style={{
                    padding: '14px',
                    fontSize: '16px',
                    fontWeight: '600',
                    borderRadius: '12px',
                    border: 'none',
                    background: loading 
                      ? 'linear-gradient(135deg, #94a3b8 0%, #64748b 100%)'
                      : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    boxShadow: loading 
                      ? 'none'
                      : '0 4px 15px rgba(102, 126, 234, 0.4)',
                    transition: 'all 0.3s ease',
                    letterSpacing: '0.3px',
                    marginTop: '8px'
                  }}
                  onMouseEnter={(e) => {
                    if (!loading) {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 6px 20px rgba(102, 126, 234, 0.5)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!loading) {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 4px 15px rgba(102, 126, 234, 0.4)';
                    }
                  }}
                >
                  {loading ? 'Signing in...' : 'Sign In'}
                </Button>
              </Form>
            </Card.Body>
          </Card>
        </div>
    </div>
  );
}


