import { STATIC_NOVELS } from "@/lib/novels-data";
import { ReaderClient } from "./reader-client";

export function generateStaticParams() {
  return STATIC_NOVELS.map((novel) => ({ id: novel.id }));
}

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ReaderClient novelId={id} />;
}

