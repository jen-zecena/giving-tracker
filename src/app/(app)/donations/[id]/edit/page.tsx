export default async function EditDonationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold tracking-tight">Edit Donation</h1>
      <p className="mt-2 text-muted-foreground">
        Edit form for donation {id} will appear here.
      </p>
    </div>
  );
}
