import { useState } from 'react';
import type { FormEvent, ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { Form, Button, Alert } from 'react-bootstrap';
import { loginUser } from '../slices/authSlice';
import type { AppDispatch } from '../store/store';

export const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      await dispatch(loginUser({ email, password })).unwrap();
      navigate('/risk_factors_grid');
    } catch (err: any) {
      setError(err.message || 'Не удалось войти. Проверьте email и пароль.');
    }
  };

  return (
    <div className="add-container">
      <h1 className="add-title">Вход в систему</h1>

      {error && (
        <Alert variant="danger" onClose={() => setError('')} dismissible>
          {error}
        </Alert>
      )}

      <div className="login-card">
        <Form onSubmit={handleSubmit}>
          <Form.Label>Email</Form.Label>
          <Form.Control
            type="email"
            value={email}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
            required
            className="form-input"
          />

          <Form.Label>Пароль</Form.Label>
          <Form.Control
            type="password"
            value={password}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
            required
            className="form-input"
          />

          <Button type="submit" className="btn-save" disabled={!email || !password}>
            Войти
          </Button>
        </Form>
      </div>
    </div>
  );
};