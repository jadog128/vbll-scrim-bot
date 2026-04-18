import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { execute } from "@/lib/db";
import SubmissionForm from "@/components/SubmissionForm";
import { Package, ShieldCheck } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function NewRequestPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  // Fetch available items
  const optionsRes = await execute("SELECT name FROM batch_options");
  const options = optionsRes.rows.map((r: any) => r.name);

  return (
    <div className="max-w-4xl mx-auto py-10 space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="text-center space-y-2">
        <h2 className="text-4xl font-black text-on-surface tracking-tight">Request Customs</h2>
        <p className="text-on-surface-variant font-medium">Submit your verification proof to enter the batch queue.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2">
            <SubmissionForm options={options} />
        </div>

        <div className="space-y-6">
            <div className="bg-primary/5 rounded-[2rem] p-6 border border-primary/10 space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center text-white">
                    <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                    <h4 className="font-bold text-on-surface">Verification Process</h4>
                    <p className="text-xs text-on-surface-variant leading-relaxed mt-1">
                        All submissions are manually reviewed by VBLL Staff. Ensure your Discord Message link is accessible.
                    </p>
                </div>
            </div>

            <div className="bg-surface-container-low rounded-[2.5rem] p-6 border border-outline-variant/10">
                <h4 className="text-xs font-black uppercase tracking-widest text-on-surface-variant mb-4 flex items-center gap-2">
                    <Package className="w-3 h-3" /> 
                    Current Batch Info
                </h4>
                <div className="space-y-4">
                    <div className="flex justify-between items-end">
                        <span className="text-sm font-medium text-on-surface-variant">Queue Status</span>
                        <span className="text-lg font-bold text-primary">Active</span>
                    </div>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
}
