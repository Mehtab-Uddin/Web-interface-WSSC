import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import { LogIn, Eye, EyeOff } from 'lucide-react';
import { Form, Button, Card, Container, Badge, InputGroup } from 'react-bootstrap';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await login(email, password);
      toast.success('Login successful!');
      navigate('/');
    } catch (error) {
      toast.error(error.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        .placeholder-white::placeholder {
          color: rgba(255, 255, 255, 0.7) !important;
        }
        .placeholder-white:-ms-input-placeholder {
          color: rgba(255, 255, 255, 0.7) !important;
        }
        .placeholder-white::-ms-input-placeholder {
          color: rgba(255, 255, 255, 0.7) !important;
        }
      `}</style>
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundImage: 'url(/logo-1.png)',
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
      padding: '20px',
      position: 'relative'
    }}>
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.3) 0%, rgba(118, 75, 162, 0.3) 100%)',
        zIndex: 0
      }}></div>
      <Container style={{ position: 'relative', zIndex: 1 }}>
        <div className="d-flex justify-content-center">
          <Card style={{
            width: '100%',
            maxWidth: '450px',
            borderRadius: '24px',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.15) 0%, rgba(255, 255, 255, 0.1) 100%)',
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
                  color: '#ffffff',
                  letterSpacing: '-0.5px',
                  textShadow: '0 2px 10px rgba(0, 0, 0, 0.3)'
                }}>
                  WSSC Admin Portal
                </h2>
                <p className="mb-0" style={{ 
                  color: 'rgba(255, 255, 255, 0.9)', 
                  fontSize: '15px',
                  fontWeight: '500',
                  textShadow: '0 1px 5px rgba(0, 0, 0, 0.2)'
                }}>
                  Sign in to continue
                </p>
              </div>

              <Form onSubmit={handleSubmit}>
                <Form.Group className="mb-4">
                  <Form.Label className="fw-semibold mb-2" style={{ 
                    color: '#ffffff',
                    fontSize: '14px',
                    letterSpacing: '0.3px',
                    textShadow: '0 1px 3px rgba(0, 0, 0, 0.3)'
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
                      border: '2px solid rgba(255, 255, 255, 0.3)',
                      borderRadius: '12px',
                      transition: 'all 0.3s ease',
                      backgroundColor: 'rgba(255, 255, 255, 0.2)',
                      color: '#ffffff'
                    }}
                    className="placeholder-white"
                    onFocus={(e) => {
                      e.target.style.borderColor = '#ffffff';
                      e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.3)';
                      e.target.style.boxShadow = '0 0 0 3px rgba(255, 255, 255, 0.2)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = 'rgba(255, 255, 255, 0.3)';
                      e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                </Form.Group>

                <Form.Group className="mb-4">
                  <Form.Label className="fw-semibold mb-2" style={{ 
                    color: '#ffffff',
                    fontSize: '14px',
                    letterSpacing: '0.3px',
                    textShadow: '0 1px 3px rgba(0, 0, 0, 0.3)'
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
                        border: '2px solid rgba(255, 255, 255, 0.3)',
                        borderRight: 'none',
                        borderRadius: '12px 0 0 12px',
                        transition: 'all 0.3s ease',
                        backgroundColor: 'rgba(255, 255, 255, 0.2)',
                        color: '#ffffff'
                      }}
                      className="placeholder-white"
                      onFocus={(e) => {
                        e.target.style.borderColor = '#ffffff';
                        e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.3)';
                        e.target.style.boxShadow = '0 0 0 3px rgba(255, 255, 255, 0.2)';
                        const inputGroup = e.target.closest('.input-group');
                        if (inputGroup) {
                          const textElement = inputGroup.querySelector('.input-group-text');
                          if (textElement) {
                            textElement.style.borderColor = '#ffffff';
                          }
                        }
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = 'rgba(255, 255, 255, 0.3)';
                        e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
                        e.target.style.boxShadow = 'none';
                        const inputGroup = e.target.closest('.input-group');
                        if (inputGroup) {
                          const textElement = inputGroup.querySelector('.input-group-text');
                          if (textElement) {
                            textElement.style.borderColor = 'rgba(255, 255, 255, 0.3)';
                          }
                        }
                      }}
                    />
                    <InputGroup.Text
                      onClick={() => setShowPassword(!showPassword)}
                      style={{
                        cursor: 'pointer',
                        backgroundColor: 'rgba(255, 255, 255, 0.2)',
                        border: '2px solid rgba(255, 255, 255, 0.3)',
                        borderLeft: 'none',
                        borderRadius: '0 12px 12px 0',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '0 18px',
                        transition: 'all 0.3s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.3)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
                      }}
                    >
                      {showPassword ? (
                        <EyeOff size={20} color="#ffffff" />
                      ) : (
                        <Eye size={20} color="#ffffff" />
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
      </Container>
    </div>
    </>
  );
}

