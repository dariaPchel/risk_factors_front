export interface RiskFactor {
  id: number;
  name: string;
  description: string;
  age: number;
  bmi: number;
  image_url: string;
  video_url: string;
  likes_count: number;
  status: string;
  created_at: string;
  published_at: string | null;
  user_id: number;
  risk_percentage?: number;
  is_liked?: number;   // 1 — лайкнул текущий пользователь (приходит с бэкенда)
  is_creator?: number; // 1 — создатель текущий пользователь (приходит с бэкенда)
}

export const MOCK_RISK_FACTORS: RiskFactor[] = [
  {
    id: 1,
    name: "Возраст старше 70 лет",
    description: "Пожилой возраст является значимым фактором риска развития сердечно-сосудистых заболеваний.",
    age: 70,
    bmi: 24.5,
    image_url: "",
    video_url: "",
    likes_count: 12,
    status: "published",
    created_at: "2024-01-15T10:30:00Z",
    published_at: "2024-01-16T14:20:00Z",
    user_id: 1
  },
  {
    id: 2,
    name: "Сахарный диабет 2 типа",
    description: "Хроническое заболевание, влияющее на обмен веществ.",
    age: 55,
    bmi: 30.2,
    image_url: "",
    video_url: "",
    likes_count: 8,
    status: "published",
    created_at: "2024-02-10T08:15:00Z",
    published_at: "2024-02-11T09:00:00Z",
    user_id: 1
  },
  {
    id: 3,
    name: "Артериальная гипертензия",
    description: "Повышенное артериальное давление требует контроля.",
    age: 50,
    bmi: 27.8,
    image_url: "",
    video_url: "",
    likes_count: 15,
    status: "published",
    created_at: "2024-03-05T12:00:00Z",
    published_at: "2024-03-06T10:30:00Z",
    user_id: 1
  },
  {
    id: 4,
    name: "Курение",
    description: "Курение табака значительно повышает риск заболеваний.",
    age: 40,
    bmi: 23.0,
    image_url: "",
    video_url: "",
    likes_count: 20,
    status: "published",
    created_at: "2024-04-01T15:45:00Z",
    published_at: "2024-04-02T11:00:00Z",
    user_id: 1
  },
  {
    id: 5,
    name: "Ожирение",
    description: "Избыточная масса тела является фактором риска.",
    age: 45,
    bmi: 32.5,
    image_url: "",
    video_url: "",
    likes_count: 10,
    status: "published",
    created_at: "2024-04-20T11:20:00Z",
    published_at: null,
    user_id: 1
  }
];