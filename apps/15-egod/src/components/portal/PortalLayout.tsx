import PortalSidebar from "./PortalSidebar";

const PortalLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="flex min-h-screen bg-background" dir="rtl">
      <PortalSidebar />
      <main className="flex-1 p-6 overflow-auto">
        {children}
      </main>
    </div>
  );
};

export default PortalLayout;