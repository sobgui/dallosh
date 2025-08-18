import { HomeSidebar } from "@/components/layout/HomeSidebar";
import { HomeHeader } from "@/components/layout/HomeHeader";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";

export default function HomeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <HomeSidebar />
      <SidebarInset>
        <HomeHeader />
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
