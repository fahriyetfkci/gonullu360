import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import EventManagementFeature from "./EventManagementFeature";
import { createEvent, getEventOptions } from "./services/eventApi";

jest.mock("../../components/Sidebar", () => () => <aside>Menü</aside>);
jest.mock("../../components/Navbar", () => () => <nav>Kullanıcı</nav>);
jest.mock("./services/eventApi", () => ({
  getEventOptions: jest.fn(),
  createEvent: jest.fn(),
  createEventGroup: jest.fn(),
  uploadEventPoster: jest.fn(),
  getEventApiErrorMessage: jest.fn(() => "Etkinlik API hatası"),
}));

describe("EventManagementFeature", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getEventOptions.mockResolvedValue({
      groups: [{ id: "group-1", name: "Genel", color: "#665cf6", memberCount: 150 }],
      forms: [{ id: "form-1", title: "Katılım Formu", publishedVersion: 1 }],
    });
    createEvent.mockResolvedValue({ id: "event-1", name: "Gönüllü Buluşması" });
  });

  it("loads options and saves a valid event", async () => {
    render(<EventManagementFeature />);

    expect(await screen.findByText("Genel")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Etkinlik Adı *"), { target: { value: "Gönüllü Buluşması" } });
    fireEvent.change(screen.getByLabelText("Etkinlik Adresi *"), { target: { value: "İstanbul" } });
    fireEvent.click(screen.getByRole("button", { name: "Kaydet" }));

    await waitFor(() => expect(createEvent).toHaveBeenCalledTimes(1));
    expect(createEvent).toHaveBeenCalledWith(expect.objectContaining({
      name: "Gönüllü Buluşması",
      slug: "gonullu-bulusmasi",
      groupIds: ["group-1"],
    }));
    expect(await screen.findByRole("alert")).toHaveTextContent("başarıyla kaydedildi");
  });
});
