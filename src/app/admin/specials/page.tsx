"use client";

import { useState, useEffect, useCallback } from "react";
import { Upgrade } from "@prisma/client";
import * as z from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/contexts/ToastContext";
import { useTranslations } from "next-intl";

interface ExtendedUpgrade extends Upgrade {
  countdownEndsAt: Date | null;
  imageUrl: string | null;
  isSpecial: boolean;
}

const specialUpgradeSchema = z
  .object({
    name: z
      .string()
      .min(1, "Name is required")
      .max(100, "Name must be 100 characters or less"),
    description: z
      .string()
      .min(1, "Description is required")
      .max(200, "Description must be 200 characters or less"),
    baseCost: z
      .number()
      .min(1, "Base cost must be a positive number"),
    basePoints: z
      .number()
      .min(1, "Base points must be a positive number"),
    imageUrl: z.string().url("Image URL must be a valid URL").min(1, "Image URL is required"),
    countdownEndsAt: z.string().optional(),
    isSpecial: z.boolean().default(true),
  });

type SpecialUpgradeFormData = z.infer<typeof specialUpgradeSchema>;

const DEFAULT_FORM_VALUES: Partial<SpecialUpgradeFormData> = {
  name: "",
  description: "",
  baseCost: 1000,
  basePoints: 50,
  imageUrl: "",
  countdownEndsAt: "",
  isSpecial: true,
};

export default function AdminSpecials() {
  const t = useTranslations("AdminSpecials");
  const showToast = useToast();
  const [specials, setSpecials] = useState<ExtendedUpgrade[]>([]);
  const [editingSpecial, setEditingSpecial] = useState<ExtendedUpgrade | null>(null);
  const [isLoadingSpecials, setIsLoadingSpecials] = useState(true);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<SpecialUpgradeFormData>({
    resolver: zodResolver(specialUpgradeSchema),
    defaultValues: DEFAULT_FORM_VALUES,
  });

  const fetchSpecials = useCallback(async () => {
    setIsLoadingSpecials(true);
    try {
      const response = await fetch("/api/admin/specials");
      const data = await response.json();
      setSpecials(data);
    } catch (error) {
      console.error("Error fetching specials:", error);
      showToast("Error fetching specials", "error");
    } finally {
      setIsLoadingSpecials(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchSpecials();
  }, [fetchSpecials]);

  const onSubmit = async (data: SpecialUpgradeFormData) => {
    try {
      const specialData = {
        ...data,
        category: "Specials",
        subcategory: "Limited Time",
        srNo: editingSpecial?.srNo || Date.now().toString(),
      };

      const url = editingSpecial 
        ? `/api/admin/specials/${editingSpecial.id}` 
        : "/api/admin/specials";
      
      const method = editingSpecial ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(specialData),
      });

      if (!response.ok) {
        throw new Error("Failed to save special upgrade");
      }

      const result = await response.json();
      
      if (editingSpecial) {
        showToast("Special upgrade updated successfully!", "success");
      } else {
        showToast("Special upgrade created successfully!", "success");
      }

      reset(DEFAULT_FORM_VALUES);
      setEditingSpecial(null);
      fetchSpecials();
    } catch (error) {
      console.error("Error saving special upgrade:", error);
      showToast("Error saving special upgrade", "error");
    }
  };

  const handleEdit = (special: ExtendedUpgrade) => {
    setEditingSpecial(special);
    setValue("name", special.name);
    setValue("description", special.description);
    setValue("baseCost", special.baseCost);
    setValue("basePoints", special.basePoints);
    setValue("imageUrl", special.imageUrl || "");
    setValue("countdownEndsAt", special.countdownEndsAt ? new Date(special.countdownEndsAt).toISOString().slice(0, 16) : "");
    setValue("isSpecial", special.isSpecial);
  };

  const handleDelete = async (special: ExtendedUpgrade) => {
    if (!confirm("Are you sure you want to delete this special upgrade?")) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/specials/${special.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete special upgrade");
      }

      showToast("Special upgrade deleted successfully!", "success");
      fetchSpecials();
    } catch (error) {
      console.error("Error deleting special upgrade:", error);
      showToast("Error deleting special upgrade", "error");
    }
  };

  const handleCancelEdit = () => {
    setEditingSpecial(null);
    reset(DEFAULT_FORM_VALUES);
  };

  const formatCountdown = (countdownEndsAt: Date | null) => {
    if (!countdownEndsAt) return "No timer";
    
    const now = new Date();
    const end = new Date(countdownEndsAt);
    
    if (end <= now) {
      return "Expired";
    }
    
    const diff = end.getTime() - now.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${days}d ${hours}h ${minutes}m`;
  };

  const isExpired = (countdownEndsAt: Date | null) => {
    if (!countdownEndsAt) return false;
    return new Date(countdownEndsAt) <= new Date();
  };

  return (
    <div className="min-h-screen bg-[#1d2025] text-white p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold text-customGreen-700 mb-8">
          Manage Specials Upgrades
        </h1>

        {/* Form Section */}
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="mb-12 bg-[#272a2f] rounded-lg p-6"
        >
          <h2 className="text-2xl font-semibold mb-6">
            {editingSpecial ? "Edit Special Upgrade" : "Add New Special Upgrade"}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <input
                {...register("name")}
                placeholder="Name"
                className="w-full bg-[#3a3d42] p-3 rounded-lg"
                maxLength={100}
                autoComplete="off"
              />
              {errors.name && (
                <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>
              )}
            </div>

            <div>
              <input
                {...register("baseCost", { valueAsNumber: true })}
                type="number"
                min="1"
                placeholder="Base Cost"
                className="w-full bg-[#3a3d42] p-3 rounded-lg"
                autoComplete="off"
              />
              {errors.baseCost && (
                <p className="text-red-500 text-sm mt-1">{errors.baseCost.message}</p>
              )}
            </div>

            <div>
              <input
                {...register("basePoints", { valueAsNumber: true })}
                type="number"
                min="1"
                placeholder="Base Points"
                className="w-full bg-[#3a3d42] p-3 rounded-lg"
                autoComplete="off"
              />
              {errors.basePoints && (
                <p className="text-red-500 text-sm mt-1">{errors.basePoints.message}</p>
              )}
            </div>

            <div>
              <input
                {...register("countdownEndsAt")}
                type="datetime-local"
                className="w-full bg-[#3a3d42] p-3 rounded-lg"
              />
              {errors.countdownEndsAt && (
                <p className="text-red-500 text-sm mt-1">{errors.countdownEndsAt.message}</p>
              )}
            </div>
          </div>

          <div className="mt-6">
            <textarea
              {...register("description")}
              rows={3}
              placeholder="Description"
              className="w-full bg-[#3a3d42] p-3 rounded-lg"
              maxLength={200}
              autoComplete="off"
            />
            {errors.description && (
              <p className="text-red-500 text-sm mt-1">{errors.description.message}</p>
            )}
          </div>

          <div className="mt-6">
            <input
              {...register("imageUrl")}
              type="url"
              placeholder="Image URL"
              className="w-full bg-[#3a3d42] p-3 rounded-lg"
              autoComplete="off"
            />
            {errors.imageUrl && (
              <p className="text-red-500 text-sm mt-1">{errors.imageUrl.message}</p>
            )}
          </div>

          <div className="mt-6 flex justify-end space-x-4">
            {editingSpecial && (
              <button
                type="button"
                onClick={handleCancelEdit}
                className="px-6 py-2 bg-gray-600 rounded-lg hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              className="px-6 py-2 bg-customGreen-700 text-white rounded-lg hover:bg-customGreen-800 transition-colors"
            >
              {editingSpecial ? "Update Special Upgrade" : "Add Special Upgrade"}
            </button>
          </div>
        </form>

        {/* Existing Specials Section */}
        <div className="bg-[#272a2f] rounded-lg p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-semibold">
              Existing Specials Upgrades ({specials.length})
            </h2>
            <button
              onClick={fetchSpecials}
              className="p-2 bg-[#3a3d42] rounded-full hover:bg-[#4a4d52] transition-colors"
            >
              <svg
                className="w-6 h-6 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            </button>
          </div>

          {isLoadingSpecials ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-customGreen-700 mx-auto"></div>
              <p className="mt-2 text-gray-400">Loading specials...</p>
            </div>
          ) : specials.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-400">No specials upgrades available</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-700">
                <thead className="bg-[#3a3d42]">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Cost
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Points
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Countdown
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-[#272a2f] divide-y divide-gray-700">
                  {specials.map((special) => (
                    <tr key={special.id} className={isExpired(special.countdownEndsAt) ? "bg-red-900/20" : ""}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-white">{special.name}</div>
                        <div className="text-sm text-gray-400">{special.description}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                        {special.baseCost.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                        {special.basePoints.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                        {formatCountdown(special.countdownEndsAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          isExpired(special.countdownEndsAt)
                            ? "bg-red-900 text-red-200"
                            : "bg-green-900 text-green-200"
                        }`}>
                          {isExpired(special.countdownEndsAt) ? "Expired" : "Active"}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => handleEdit(special)}
                          className="text-customGreen-400 hover:text-customGreen-300 mr-4 transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(special)}
                          className="text-red-400 hover:text-red-300 transition-colors"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 