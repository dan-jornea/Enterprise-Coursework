"use client";
import { useParams } from "next/navigation";
import ItemForm from "@/components/ItemForm";

export default function EditItem() {
  const { id } = useParams<{ id: string }>();
  return <ItemForm itemId={id} />;
}
