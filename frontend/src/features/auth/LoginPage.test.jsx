import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import LoginPage from "./LoginPage";

const mockLogin = jest.fn();

jest.mock("./AuthProvider", () => ({
  useAuth: () => ({ login: mockLogin }),
}));

jest.mock("./services/authApi", () => ({
  getAuthErrorMessage: jest.fn(() => "Giriş başarısız"),
  requestPasswordReset: jest.fn(),
}));

test("yönetici bilgileriyle giriş isteği gönderir", async () => {
  mockLogin.mockResolvedValue({ id: "admin-1" });
  render(<LoginPage />);

  fireEvent.change(screen.getByLabelText("E-posta adresi"), {
    target: { value: "admin@example.com" },
  });
  fireEvent.change(screen.getByLabelText("Şifre"), {
    target: { value: "Str0ng!Pass" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Giriş Yap" }));

  await waitFor(() => expect(mockLogin).toHaveBeenCalledWith("admin@example.com", "Str0ng!Pass"));
});
