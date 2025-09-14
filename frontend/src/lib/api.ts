import axios from 'axios';

const baseURL = import.meta.env.VITE_API_URL?.replace(/\/+$/, '') || 'http://localhost:5000/api';

export const api = axios.create({
  baseURL,
  withCredentials: true
});
