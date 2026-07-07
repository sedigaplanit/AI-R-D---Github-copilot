const CSV_KEY = 'users_db';
const HEADER = 'name,email,password';

const parseCSV = (csv) => {
  const lines = csv.trim().split('\n').filter(Boolean);
  if (lines.length <= 1) return [];
  return lines.slice(1).map((line) => {
    const idx1 = line.indexOf(',');
    const idx2 = line.lastIndexOf(',');
    return {
      name: line.slice(0, idx1),
      email: line.slice(idx1 + 1, idx2),
      password: line.slice(idx2 + 1),
    };
  });
};

const serializeCSV = (users) => {
  return [HEADER, ...users.map((u) => `${u.name},${u.email},${u.password}`)].join('\n');
};

export const getUsers = () => {
  const csv = localStorage.getItem(CSV_KEY);
  if (!csv) return [];
  return parseCSV(csv);
};

export const addUser = ({ name, email, password }) => {
  const users = getUsers();
  users.push({ name, email, password });
  localStorage.setItem(CSV_KEY, serializeCSV(users));
};

export const findUser = (email, password) => {
  return getUsers().find((u) => u.email === email && u.password === password) || null;
};

export const emailExists = (email) => {
  return getUsers().some((u) => u.email === email);
};
