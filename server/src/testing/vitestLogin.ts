import { Server } from "http";
import request from "supertest";

const vitestLogin = async (app: Server, email: string, password = "password") => {
  const loginMutation = `
        mutation Login($data: LoginData!) {
          login(data: $data)
        }
      `;

  const res = await request(app)
    .post("/graphql")
    .send({
      query: loginMutation,
      variables: {
        data: {
          email,
          password,
          rememberMe: true,
        },
      },
    });

  if (!res.body.data || !res.body.data.login)
    throw new Error(`Unable to login: ${JSON.stringify(res.body)}`);

  return res.body.data.login;
};

export default vitestLogin;
