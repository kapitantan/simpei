export const handler = async () => ({
  statusCode: 501,
  headers: {
    "content-type": "application/json",
  },
  body: JSON.stringify({
    message: "Room creation is not implemented yet.",
  }),
});
