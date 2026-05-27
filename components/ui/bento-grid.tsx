"use client"

import { cn } from "@/lib/utils";
import { motion } from "motion/react";

export const BentoGrid = ({
  className,
  children,
}: {
  className?: string;
  children?: React.ReactNode;
}) => {
  return (
    <div
      className={cn(
        "mx-auto grid max-w-7xl grid-cols-1 gap-4 md:auto-rows-[18rem] md:grid-cols-3",
        className,
      )}
    >
      {children}
    </div>
  );
};

export const BentoGridItem = ({
  className,
  title,
  description,
  header,
  icon,
  index = 0,
}: {
  className?: string;
  title?: string | React.ReactNode;
  description?: string | React.ReactNode;
  header?: React.ReactNode;
  icon?: React.ReactNode;
  index?: number;
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{
        duration: 0.5,
        delay: index * 0.1,
        ease: [0.21, 0.47, 0.32, 0.98],
      }}
      whileHover={{ scale: 1.02 }}
      className={cn(
        "group/bento shadow-sm row-span-1 flex flex-col justify-between space-y-4 rounded-xl border border-border bg-card p-4 transition duration-200 hover:shadow-soft-lg hover:border-primary/20",
        className,
      )}
    >
      {header}
      <div className="transition duration-200 group-hover/bento:translate-x-2">
        {icon}
        <div className="mt-2 mb-2 font-serif text-lg font-bold text-foreground">
          {title}
        </div>
        <div className="font-sans text-sm font-normal text-muted-foreground">
          {description}
        </div>
      </div>
    </motion.div>
  );
};
