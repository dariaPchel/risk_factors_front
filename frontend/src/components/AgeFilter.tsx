import type { FormEvent } from 'react';
import { Form, Button } from 'react-bootstrap';

interface AgeFilterProps {
  maxAge: number;                    
  onChange: (value: number) => void; 
  onApply: () => void;              
}

export const AgeFilter = ({ maxAge, onChange, onApply }: AgeFilterProps) => {
  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    onApply();
  };

  return (
    <Form className="filter-form" onSubmit={handleSubmit}>
      <Form.Label htmlFor="maxAge">Фильтр по возрасту пациентов</Form.Label>
      <div className="filter-input-wrapper">
        <Form.Range
          id="maxAge"
          className="filter-slider"
          min={0}
          max={100}
          value={maxAge}
          onChange={(e) => onChange(Number(e.target.value))}
        />
        <span className="filter-value">{maxAge}</span>
        <Button type="submit" className="filter-btn">
          Применить
        </Button>
      </div>
    </Form>
  );
};