import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import PageLayout from "@/components/PageLayout";

const DashboardPage = () => {
  const { user } = useAuth();

  return (
    <PageLayout 
      title="Dashboard" 
      description={`Welcome back, ${user?.email?.split('@')[0] || "User"}!`}
    >
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        
      </div>
    </PageLayout>
  );
};

export default DashboardPage;