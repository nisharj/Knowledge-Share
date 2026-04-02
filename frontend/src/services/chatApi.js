import api from "./api";

export const sendChatMessage = async (payload) => {
  const response = await api.post("/chat/message", payload);
  return response.data;
};
