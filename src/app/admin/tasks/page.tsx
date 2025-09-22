// app/admin/tasks/page.tsx

"use client";

import { useState, useEffect, useCallback } from "react";
import { Task, TaskType, TaskAction, Partner } from "@prisma/client";
import * as z from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Image from "next/image";
import { formatNumber } from "@/utils/ui";
import { imageMap, JOK_POINTS } from "@/images";
import { useToast } from "@/contexts/ToastContext";
import { useTranslations } from "next-intl";

interface ExtendedTask extends Task {
  taskAction: TaskAction;
  taskData: {
    link?: string;
    chatId?: string;
    friendsNumber?: number;
    backgroundImage?: string;
    waitTime?: number;
    requireSubmission?: boolean;
  };
}

const taskSchema = z
  .object({
    title: z
      .string()
      .min(1, "Title is required")
      .max(100, "Title must be 100 characters or less"),
    description: z
      .string()
      .min(1, "Description is required")
      .max(200, "Description must be 200 characters or less"),
    points: z
      .number()
      .min(0, "Points must be a positive number")
      .nullable()
      .optional(),
    multiplier: z
      .number()
      .min(0, "Multiplier must be a positive number")
      .nullable()
      .optional(),
    rewardStars: z
      .number()
      .min(0, "Reward stars must be a positive number")
      .nullable()
      .optional(),
    type: z.nativeEnum(TaskType),
    image: z.string().min(1, "Image is required"),
    callToAction: z.string().min(1, "Call to action is required"),
    isActive: z.boolean(),
    taskAction: z.string(),
    taskData: z.object({
      link: z
        .string()
        .url("Link must be a valid URL")
        .optional()
        .or(z.literal("")),
      chatId: z.string().optional(),
      friendsNumber: z
        .number()
        .int("Number of friends must be an integer")
        .positive("Number of friends must be positive")
        .nullable()
        .optional(),
      backgroundImage: z.string().url().optional().or(z.literal("")),
      waitTime: z
        .number()
        .nullable()
        .optional(),
      requireSubmission: z.boolean().nullable().optional(),
    }),
  })
  .refine(
    (data) => {
      if (
        data.taskAction === "VISIT" &&
        data.title === "Share your affiliate link with a group or a friend"
      ) {
        // Allow empty link for this specific task
        return true;
      }
      if (data.taskAction === "VISIT") {
        return !!data.taskData.link;
      }
      if (data.taskAction === "REFERRAL") {
        return !!data.taskData.friendsNumber;
      }
      if (data.taskAction !== "VISIT" && data.taskAction !== "REFERRAL") {
        return (
          data.taskData.requireSubmission ||
          (!!data.taskData.link && !!data.taskData.chatId)
        );
      }
      return true;
    },
    {
      message: "Invalid task data for the selected task action",
      path: ["taskData"],
    }
  );

type TaskFormData = z.infer<typeof taskSchema>;

const DEFAULT_FORM_VALUES: Partial<TaskFormData> = {
  title: "",
  description: "",
  points: null,
  multiplier: null,
  rewardStars: null,
  type: TaskType.DAILY,
  image: "",
  callToAction: "",
  isActive: true,
  taskAction: "VISIT", // Default value for taskAction
  taskData: {
    link: "",
    chatId: "",
    friendsNumber: null,
    backgroundImage: "",
    waitTime: 0,
    requireSubmission: false,
  },
};

export default function AdminTasks() {
  const t = useTranslations("AdminTasks");
  const showToast = useToast();
  const [tasks, setTasks] = useState<ExtendedTask[]>([]);
  const [editingTask, setEditingTask] = useState<ExtendedTask | null>(null);
  const [isLoadingTasks, setIsLoadingTasks] = useState(true);
  const [taskActions, setTaskActions] = useState<TaskAction[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [isLoadingTaskActions, setIsLoadingTaskActions] = useState(true);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<TaskFormData>({
    resolver: zodResolver(taskSchema),
    defaultValues: DEFAULT_FORM_VALUES,
  });

  const taskAction = watch("taskAction");
  const imageValue = watch("image");

  const fetchTasks = useCallback(async () => {
    setIsLoadingTasks(true);
    try {
      const response = await fetch("/api/admin/tasks");
      const data = await response.json();
      setTasks(data);
    } catch (error) {
      console.error("Error fetching tasks:", error);
    } finally {
      setIsLoadingTasks(false);
    }
  }, []);

  const fetchTaskActionsAndPartners = useCallback(async () => {
    setIsLoadingTaskActions(true);
    try {
      const TAResponse = await fetch("/api/admin/task-actions");
      const TAData = await TAResponse.json();

      const PResponse = await fetch("/api/admin/partners");
      const PData = await PResponse.json();
      const partnersNameAndId = PData.map((partner: Partner) => ({
        name: partner.name?.toUpperCase(),
        id: partner.id,
      }));

      const concat = [...TAData, ...partnersNameAndId];

      setPartners(PData);
      setTaskActions(concat);
      setValue("taskAction", concat.length > 0 ? concat[0].name : "");
    } catch (error) {
      console.error("Error fetching task actions:", error);
    } finally {
      setIsLoadingTaskActions(false);
    }
  }, []);

  useEffect(() => {
    fetchTaskActionsAndPartners();
    fetchTasks();
  }, []);

  const onSubmit = async (data: TaskFormData) => {
    const taskData = {
      ...data,
      taskActionId: taskActions.find(
        (action) => action.name === data.taskAction
      )?.id,
    };

    try {
      if (editingTask) {
        await fetch(`/api/admin/tasks/${editingTask.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(taskData),
        });
        showToast("Task updated successfully!", "success");
      } else {
        await fetch("/api/admin/tasks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(taskData),
        });
        showToast("Task created successfully!", "success");
      }
      setEditingTask(null);
      reset(DEFAULT_FORM_VALUES);
      fetchTasks();
    } catch (error) {
      console.error("Error saving task:", error);
      showToast("Failed to save task. Please try again.", "error");
    }
  };

  const handleImageClick = (imageName: string) => {
    setValue("image", imageName);
  };

  const handleEdit = (task: ExtendedTask) => {
    setEditingTask(task);
    reset({
      ...task,
      taskAction: taskActions.find((action) => action.id === task.taskActionId)
        ?.name,
    });
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const handleDelete = async (task: ExtendedTask) => {
    if (!confirm("Are you sure you want to delete this task?")) {
      return;
    }

    try {
      await fetch(`/api/admin/tasks/${task.id}`, {
        method: "DELETE",
      });
      showToast("Task deleted successfully!", "success");
      fetchTasks();
    } catch (error) {
      console.error("Error deleting task:", error);
      showToast("Failed to delete task. Please try again.", "error");
    }
  };

  const handleCancelEdit = () => {
    setEditingTask(null);
    reset(DEFAULT_FORM_VALUES);
  };

  return (
    <div className="bg-[#1d2025] text-white min-h-screen p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold mb-8 text-customGreen-700">
          {t("title")}
        </h1>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="mb-12 bg-[#272a2f] rounded-lg p-6"
        >
          <h2 className="text-2xl font-semibold mb-6">
            {editingTask ? "Edit Task" : "Add New Task"}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <input
                {...register("title")}
                placeholder="Title"
                className="w-full bg-[#3a3d42] p-3 rounded-lg"
                maxLength={100}
                autoComplete="off"
              />
              {errors.title && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.title.message}
                </p>
              )}
            </div>

            <div>
              <input
                {...register("description")}
                placeholder="Description"
                className="w-full bg-[#3a3d42] p-3 rounded-lg"
                maxLength={200}
                autoComplete="off"
              />
              {errors.description && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.description.message}
                </p>
              )}
            </div>

            <div>
              <input
                {...register("taskData.backgroundImage")}
                placeholder="Background Image URL"
                className="w-full bg-[#3a3d42] p-3 rounded-lg"
                autoComplete="off"
              />
              {errors.taskData?.backgroundImage && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.taskData.backgroundImage.message}
                </p>
              )}
            </div>

            <div>
              <select
                {...register("taskAction")}
                className="w-full bg-[#3a3d42] p-3 rounded-lg"
                disabled={isLoadingTaskActions}
              >
                {taskActions.map((action) => (
                  <option key={action.id} value={action.name}>
                    {action.name}
                  </option>
                ))}
              </select>
              {errors.taskAction && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.taskAction.message}
                </p>
              )}
            </div>

            <div className="flex items-center space-x-2">
              <div className="flex-1">
                <input
                  type="number"
                  {...register("points", { valueAsNumber: true })}
                  placeholder="Points"
                  className="w-full bg-[#3a3d42] p-3 rounded-lg"
                  autoComplete="off"
                />
                {errors.points && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors.points.message}
                  </p>
                )}
              </div>

              <div className="flex-1">
                <input
                  type="number"
                  step={0.1}
                  {...register("multiplier", { valueAsNumber: true })}
                  placeholder="Multiplier"
                  className="w-full bg-[#3a3d42] p-3 rounded-lg"
                  autoComplete="off"
                />
                {errors.multiplier && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors.multiplier.message}
                  </p>
                )}
              </div>
              <div className="flex-1">
                <input
                  type="number"
                  step={1}
                  {...register("rewardStars", { valueAsNumber: true })}
                  placeholder="Stars"
                  className="w-full bg-[#3a3d42] p-3 rounded-lg"
                  autoComplete="off"
                />
                {errors.rewardStars && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors.rewardStars.message}
                  </p>
                )}
              </div>
            </div>

            <div>
              <select
                {...register("type")}
                className="w-full bg-[#3a3d42] p-3 rounded-lg"
              >
                {Object.values(TaskType).map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
              {errors.type && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.type.message}
                </p>
              )}
            </div>

            <div>
              <input
                {...register("callToAction")}
                placeholder="Call To Action"
                className="w-full bg-[#3a3d42] p-3 rounded-lg"
                autoComplete="off"
              />
              {errors.callToAction && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.callToAction.message}
                </p>
              )}
            </div>

            <div>
              <input
                {...register("image")}
                placeholder="Image"
                className="w-full bg-[#3a3d42] p-3 rounded-lg mb-2"
                autoComplete="off"
                readOnly
              />
              {errors.image && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.image.message}
                </p>
              )}
              <div className="flex flex-wrap gap-2 mt-2">
                {Object.entries(imageMap).map(([name, src]) => (
                  <button
                    key={name}
                    type="button"
                    onClick={() => handleImageClick(name)}
                    className={`p-1 rounded transition-colors ${
                      imageValue === name
                        ? "bg-customGreen-700 hover:bg-customGreen-800"
                        : "bg-[#3a3d42] hover:bg-[#4a4d52]"
                    }`}
                  >
                    <img
                      src={src.src}
                      alt={name}
                      className="w-8 h-8 object-cover"
                    />
                  </button>
                ))}
                {partners.map((partner) => (
                  <button
                    key={partner.id}
                    type="button"
                    onClick={() => handleImageClick(partner.name || "")}
                    className={`p-1 rounded transition-colors ${
                      imageValue === partner.name?.toUpperCase()
                        ? "bg-customGreen-700 hover:bg-customGreen-800"
                        : "bg-[#3a3d42] hover:bg-[#4a4d52]"
                    }`}
                  >
                    <img
                      src={partner.image}
                      alt={partner.name}
                      className="w-8 h-8 object-cover"
                    />
                  </button>
                ))}
              </div>
            </div>

            {taskAction === "VISIT" ? (
              <>
                <div>
                  <input
                    {...register("taskData.link")}
                    placeholder="Link"
                    className="w-full bg-[#3a3d42] p-3 rounded-lg"
                    autoComplete="off"
                  />
                  {errors.taskData?.link && (
                    <p className="text-red-500 text-sm mt-1">
                      {errors.taskData.link.message}
                    </p>
                  )}
                </div>
                <div>
                  <input
                    type="number"
                    {...register("taskData.waitTime", { valueAsNumber: true })}
                    placeholder="Wait Time (in minutes) - Default 0 minutes (no wait)"
                    className="w-full bg-[#3a3d42] p-3 rounded-lg"
                    autoComplete="off"
                  />
                  {errors.taskData?.waitTime && (
                    <p className="text-red-500 text-sm mt-1">
                      {errors.taskData.waitTime.message}
                    </p>
                  )}
                </div>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    {...register("taskData.requireSubmission")}
                    className="form-checkbox h-5 w-5 text-customGreen-700"
                    autoComplete="off"
                  />
                  <span>{t("requireSubmission")}</span>
                </label>
              </>
            ) : taskAction === "REFERRAL" ? (
              <>
                <div>
                  <input
                    type="number"
                    {...register("taskData.friendsNumber", {
                      valueAsNumber: true,
                    })}
                    placeholder="Number of Friends"
                    className="w-full bg-[#3a3d42] p-3 rounded-lg"
                    autoComplete="off"
                  />
                  {errors.taskData?.friendsNumber && (
                    <p className="text-red-500 text-sm mt-1">
                      {errors.taskData.friendsNumber.message}
                    </p>
                  )}
                </div>
                <div></div>
              </>
            ) : taskAction === "TELEGRAM" ? (
              <>
                <div>
                  <input
                    {...register("taskData.link")}
                    placeholder="Link"
                    className="w-full bg-[#3a3d42] p-3 rounded-lg"
                    autoComplete="off"
                  />
                  {errors.taskData?.link && (
                    <p className="text-red-500 text-sm mt-1">
                      {errors.taskData.link.message}
                    </p>
                  )}
                </div>
                <div>
                  <input
                    {...register("taskData.chatId")}
                    placeholder={
                      taskAction === "TELEGRAM"
                        ? "Chat ID (e.g., JokInTheBox_AI_Labs_Portal)"
                        : taskAction === "TWITTER"
                        ? "Twitter Handle (e.g., @JokInTheBox)"
                        : "Chat ID"
                    }
                    className="w-full bg-[#3a3d42] p-3 rounded-lg"
                    autoComplete="off"
                  />
                  {errors.taskData?.chatId && (
                    <p className="text-red-500 text-sm mt-1">
                      {errors.taskData.chatId.message}
                    </p>
                  )}
                </div>
              </>
            ) : (
              <>
                <div>
                  <input
                    {...register("taskData.chatId")}
                    placeholder={
                      !watch("taskData.requireSubmission")
                        ? "Chat ID"
                        : "Channel to be mentioned"
                    }
                    className="w-full bg-[#3a3d42] p-3 rounded-lg"
                    autoComplete="off"
                  />
                  {errors.taskData?.chatId && (
                    <p className="text-red-500 text-sm mt-1">
                      {errors.taskData.chatId.message}
                    </p>
                  )}
                </div>
                {!watch("taskData.requireSubmission") ? (
                  <div>
                    <input
                      {...register("taskData.link")}
                      placeholder="Link"
                      className="w-full bg-[#3a3d42] p-3 rounded-lg"
                      autoComplete="off"
                    />
                    {errors.taskData?.link && (
                      <p className="text-red-500 text-sm mt-1">
                        {errors.taskData.link.message}
                      </p>
                    )}
                  </div>
                ) : (
                  <div></div>
                )}

                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    {...register("taskData.requireSubmission")}
                    className="form-checkbox h-5 w-5 text-customGreen-700"
                    autoComplete="off"
                  />
                  <span>{t("requireSubmission")}</span>
                </label>
              </>
            )}

            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                {...register("isActive")}
                className="form-checkbox h-5 w-5 text-customGreen-700"
                autoComplete="off"
              />
              <span>{t("isActive")}</span>
            </label>

            {errors.taskData &&
              !errors.taskData.link &&
              !errors.taskData.chatId &&
              !errors.taskData.friendsNumber && (
                <p className="text-red-500 text-sm col-span-2 mt-1">
                  {errors.taskData.message}
                </p>
              )}
          </div>
          <div className="mt-6 flex justify-end space-x-4">
            {editingTask && (
              <button
                type="button"
                onClick={handleCancelEdit}
                className="px-6 py-2 bg-gray-600 rounded-lg hover:bg-gray-700 transition-colors"
              >
                {t("cancel")}
              </button>
            )}
            <button
              type="submit"
              className="px-6 py-2 bg-customGreen-700 text-white rounded-lg hover:bg-customGreen-800 transition-colors"
            >
              {editingTask ? "Update Task" : "Add Task"}
            </button>
          </div>
        </form>

        <div className="bg-[#272a2f] rounded-lg p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-semibold">
              {t("existingTasks")} ({tasks.length})
            </h2>
            <button
              onClick={fetchTasks}
              className="p-2 bg-[#3a3d42] rounded-full hover:bg-[#4a4d52] transition-colors"
            >
              <svg
                className="w-6 h-6 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {isLoadingTasks ? (
              [...Array(6)].map((_, index) => (
                <div
                  key={index}
                  className="bg-[#3a3d42] rounded-lg p-4 animate-pulse"
                >
                  <div className="h-6 bg-gray-700 rounded w-3/4 mb-4"></div>
                  <div className="h-4 bg-gray-700 rounded w-1/2 mb-2"></div>
                  <div className="h-4 bg-gray-700 rounded w-1/4"></div>
                </div>
              ))
            ) : tasks.length > 0 ? (
              tasks.map((task) => {
                return (
                  <div
                    key={task.id}
                    className="bg-[#3a3d42] rounded-lg p-4 flex flex-col h-full"
                  >
                    <div className="flex-grow">
                      <h3 className="text-xl font-semibold mb-2">
                        {task.title}
                      </h3>
                      <p className="text-gray-400 mb-3">{task.description}</p>
                      <div className="flex items-center mb-2">
                        {task.points && (
                          <>
                            <Image
                              priority={false}
                              src={JOK_POINTS}
                              alt={""}
                              width={16}
                              height={16}
                              className="w-4 h-4 mr-2"
                            />
                            <span className="text-customGreen-700 font-medium mr-2">
                              {formatNumber(task.points)}
                            </span>
                          </>
                        )}
                        {task.multiplier && (
                          <span className="text-customGreen-700 font-medium">
                            x{task.multiplier}
                          </span>
                        )}
                        {task.rewardStars && (
                          <>
                            <Image
                              priority={false}
                              src="/star.png"
                              alt="Star"
                              width={16}
                              height={48}
                              className="w-4 h-4 mr-2"
                            />
                            <span className="text-customGreen-700 font-medium">
                              {task.rewardStars}
                            </span>
                          </>
                        )}
                      </div>
                      <p className="text-sm text-gray-400">
                        {t("type")}: {task.type}
                      </p>
                      <p className="text-sm text-gray-400">
                        {t("active")}: {task.isActive ? "Yes" : "No"}
                      </p>
                      <p className="text-sm text-gray-400">
                        {t("action")}: {task.taskAction.name}
                      </p>

                      {/* Display taskData based on task action */}
                      {task.taskAction.name === "VISIT" &&
                      task.taskData?.link ? (
                        <>
                          <p className="text-sm text-gray-400 break-words">
                            {t("link")}: {task.taskData.link}
                          </p>
                          {task.taskData?.waitTime && (
                            <p className="text-sm text-gray-400">
                              {t("waitTime")}: {task.taskData.waitTime} minutes
                            </p>
                          )}
                        </>
                      ) : task.taskAction.name === "REFERRAL" &&
                        task.taskData?.friendsNumber ? (
                        <p className="text-sm text-gray-400">
                          {t("friendsRequired")}: {task.taskData.friendsNumber}
                        </p>
                      ) : (
                        <>
                          {task.taskData?.link && (
                            <p className="text-sm text-gray-400">
                              {t("link")}: {task.taskData.link}
                            </p>
                          )}
                          {task.taskData?.chatId && (
                            <p className="text-sm text-gray-400">
                              {t("chatId")}: {task.taskData.chatId}
                            </p>
                          )}
                        </>
                      )}
                    </div>
                    <div className="flex justify-between mt-4 gap-2">
                      <button
                        onClick={() => handleDelete(task)}
                        className="w-full px-4 py-2 bg-red-700 text-white rounded-lg hover:bg-red-800 transition-colors"
                      >
                        Delete
                      </button>
                      <button
                        onClick={() => handleEdit(task)}
                        className="w-full px-4 py-2 bg-customGreen-700 text-white rounded-lg hover:bg-customGreen-800 transition-colors"
                      >
                        {t("edit")}
                      </button>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="col-span-full text-center text-gray-400 bg-[#3a3d42] rounded-lg p-8">
                {t("noTasks")}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
