import { useState, useRef, useEffect } from 'react';
import type { FormEvent, ChangeEvent } from 'react';
import { Form, Button, Spinner, Alert } from 'react-bootstrap';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { addRiskFactorThunk, publishRiskFactorThunk } from '../slices/riskFactorsSlice';
import type { RootState, AppDispatch } from '../store/store';

const DEFAULT_IMAGE = '/default-photo.png';
const DEFAULT_VIDEO = '/default_video.mp4';
const MAX_IMAGE_MB = 10;
const MAX_VIDEO_MB = 100;

export const AddPage = () => {
  const [step, setStep] = useState<1 | 2>(1);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [age, setAge] = useState('');
  const [bmi, setBmi] = useState('');
  
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [videoPreview, setVideoPreview] = useState<string>('');
  const [fileError, setFileError] = useState('');
  const [submitError, setSubmitError] = useState<string | null>(null);
  
  // ХРАНИМ ID ЧЕРНОВИКА
  const [draftId, setDraftId] = useState<number | null>(null);

  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { loading } = useSelector((state: RootState) => state.riskFactors);

  useEffect(() => {
    return () => {
      if (imagePreview) URL.revokeObjectURL(imagePreview);
      if (videoPreview) URL.revokeObjectURL(videoPreview);
    };
  }, [imagePreview, videoPreview]);

  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setFileError('Выберите файл изображения (jpg, png, webp...)');
      return;
    }
    if (file.size > MAX_IMAGE_MB * 1024 * 1024) {
      setFileError(`Изображение больше ${MAX_IMAGE_MB} МБ`);
      return;
    }
    setFileError('');
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleVideoChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('video/')) {
      setFileError('Выберите видеофайл (mp4, webm...)');
      return;
    }
    if (file.size > MAX_VIDEO_MB * 1024 * 1024) {
      setFileError(`Видео больше ${MAX_VIDEO_MB} МБ`);
      return;
    }
    setFileError('');
    setVideoFile(file);
    setVideoPreview(URL.createObjectURL(file));
  };

  // ШАГ 1: Создаём черновик и ПОЛУЧАЕМ ЕГО ID
  const handleSaveDraft = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitError(null);
    if (!name.trim()) return;

    const formData = new FormData();
    formData.append('name', name);
    if (imageFile) formData.append('image', imageFile);
    if (videoFile) formData.append('video', videoFile);

    try {
      const result = await dispatch(addRiskFactorThunk(formData)).unwrap();
      console.log('✅ Черновик создан, ответ бэкенда:', result);
      
      // Бэкенд возвращает объект { id: 123, name: "...", ... }
      const newId = (result as any)?.id || (result as any)?.ID;
      
      if (newId && newId > 0) {
        setDraftId(newId); // ЗАПОМИНАЕМ ID!
        setStep(2);        // Переходим ко второму шагу
      } else {
        setSubmitError('Не удалось получить ID черновика');
      }
    } catch (err: any) {
      console.error('❌ Ошибка:', err);
      setSubmitError(err.message || 'Ошибка сохранения черновика');
    }
  };

  // ШАГ 2: Публикуем черновик по его ID
  const handlePublish = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitError(null);
    
    if (!draftId) {
      setSubmitError('ID черновика не найден. Начните сначала.');
      return;
    }

    const formData = new FormData();
    formData.append('description', description);
    formData.append('age', String(age));
    formData.append('bmi', String(bmi));

    try {
      console.log('🚀 Публикуем черновик с ID:', draftId);
      // ВЫЗЫВАЕМ ИМЕННО PUBLISH THUNK
      await dispatch(publishRiskFactorThunk({ id: draftId, formData })).unwrap();
      navigate('/risk_factors_grid');
    } catch (err: any) {
      console.error('❌ Ошибка публикации:', err);
      setSubmitError(err.message || 'Ошибка публикации');
    }
  };

  const clickable = { cursor: 'pointer' } as const;

  return (
    <div className="add-container">
      <h1 className="add-title">Добавить фактор риска</h1>

      {submitError && (
        <Alert variant="danger" onClose={() => setSubmitError(null)} dismissible>
          {submitError}
        </Alert>
      )}

      <input ref={imageInputRef} type="file" accept="image/*" onChange={handleImageChange} style={{ display: 'none' }} />
      <input ref={videoInputRef} type="file" accept="video/*" onChange={handleVideoChange} style={{ display: 'none' }} />

      <div className="upload-section">
        <div className="upload-card" style={{ marginBottom: '16px', ...clickable }} onClick={() => imageInputRef.current?.click()} role="button" tabIndex={0}>
          <img src={imagePreview || DEFAULT_IMAGE} alt="Изображение" className="upload-preview" />
        </div>
        <div className="upload-card" style={clickable} onClick={() => videoInputRef.current?.click()} role="button" tabIndex={0}>
          <video key={videoPreview || DEFAULT_VIDEO} src={videoPreview || DEFAULT_VIDEO} className="upload-preview-video" autoPlay loop muted playsInline />
        </div>
        {fileError && <div style={{ color: '#FF4757', fontSize: 13, marginTop: 8 }}>{fileError}</div>}
      </div>

      {step === 1 && (
        <Form onSubmit={handleSaveDraft}>
          <div className="form-card">
            <Form.Label>Название фактора риска</Form.Label>
            <Form.Control type="text" className="form-input" placeholder="Например: Возраст старше 70 лет" value={name} onChange={(e: ChangeEvent<HTMLInputElement>) => setName(e.target.value)} required />
          </div>
          <Button type="submit" className="btn-save" disabled={loading}>
            {loading ? <Spinner animation="border" size="sm" /> : 'Далее (Сохранить черновик)'}
          </Button>
        </Form>
      )}

      {step === 2 && (
        <Form onSubmit={handlePublish}>
          <div className="form-card">
            <h3 className="form-card-title">Заполните данные для публикации</h3>
            <Form.Label>Название</Form.Label>
            <Form.Control type="text" className="form-input" value={name} readOnly />
            <Form.Label>Описание</Form.Label>
            <Form.Control as="textarea" rows={3} className="form-input" placeholder="Краткое описание фактора риска..." value={description} onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value)} required />
            <div className="form-row">
              <div>
                <Form.Label>Возраст (лет)</Form.Label>
                <Form.Control type="number" className="form-input" placeholder="70" value={age} onChange={(e: ChangeEvent<HTMLInputElement>) => setAge(e.target.value)} required />
              </div>
              <div>
                <Form.Label>ИМТ</Form.Label>
                <Form.Control type="number" step="0.1" className="form-input" placeholder="24.5" value={bmi} onChange={(e: ChangeEvent<HTMLInputElement>) => setBmi(e.target.value)} required />
              </div>
            </div>
          </div>
          <Button type="submit" className="btn-save" disabled={loading}>
            {loading ? <Spinner animation="border" size="sm" /> : 'Опубликовать карточку'}
          </Button>
        </Form>
      )}
    </div>
  );
};