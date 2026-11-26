import request from 'supertest';

export async function createAuthenticatedAgent(
  app,
  {
    name = 'Test Trader',
    email = 'trader@example.com',
    password = 'Password123',
  } = {}
) {
  const agent = request.agent(app);
  const res = await agent.post('/api/auth/register').send({
    name,
    email,
    password,
    confirmPassword: password,
    acceptTerms: true,
  });
  return { agent, user: res.body?.data?.user, registerRes: res };
}
