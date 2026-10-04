import api from "./api";

export async function login(email, password) {
  const response = await api.post("/auth/login", {
    email,
    password,
  });

  return response.data;
}

export async function getMe(token) {
  const response = await api.get("/auth/me", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return response.data;
}

export async function logout(token) {
  const response = await api.post(
    "/auth/logout",
    {},
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );

  return response.data;
}
