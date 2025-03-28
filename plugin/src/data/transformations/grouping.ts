import type { Project } from "@/api/domain/project";
import type { Section } from "@/api/domain/section";
import type { Priority } from "@/api/domain/task";
import { DueDate } from "@/data/dueDate";
import { formatAsHeader } from "@/data/dueDateFormatter";
import type { Task } from "@/data/task";
import { t } from "@/i18n";
import { GroupVariant } from "@/query/query";

export type GroupedTasks = {
  header: string;
  tasks: Task[];
};

export function groupBy(tasks: Task[], groupBy: GroupVariant): GroupedTasks[] {
  switch (groupBy) {
    case GroupVariant.Priority:
      return groupByPriority(tasks);
    case GroupVariant.Project:
      return groupByProject(tasks);
    case GroupVariant.Section:
      return groupBySection(tasks);
    case GroupVariant.Date:
      return groupByDate(tasks);
    case GroupVariant.Label:
      return groupByLabel(tasks);
    default:
      throw Error(`Cannot group by ${groupBy}`);
  }
}

function groupByPriority(tasks: Task[]): GroupedTasks[] {
  let priorities = partitionBy(tasks, (task: Task) => task.priority);
  let groups = Array.from(priorities.entries());
  // We need to 'reverse' sort since priority of 4 is actually
  // priority 1 in Todoist.
  groups.sort((a, b) => b[0] - a[0]);

  return groups.map(([priority, tasks]) => {
    return {
      header: priorityHeaderLookup[priority],
      tasks,
    };
  });
}

let priorityHeaderLookup: Record<Priority, string> = {
  1: "Priority 4",
  2: "Priority 3",
  3: "Priority 2",
  4: "Priority 1",
};

function groupByProject(tasks: Task[]): GroupedTasks[] {
  let projects = partitionBy(tasks, (task: Task) => task.project);
  let groups = Array.from(projects.entries());
  groups.sort((a, b) => {
    let aProject = a[0];
    let bProject = b[0];
    return aProject.order - bProject.order;
  });

  return groups.map(([project, tasks]) => {
    return {
      header: project?.name ?? "Unknown Project",
      tasks,
    };
  });
}

function groupBySection(tasks: Task[]): GroupedTasks[] {
  type SectionPartitionKey = {
    project: Project;
    section: Section | undefined;
  };

  let makeHeader = (key: SectionPartitionKey) => {
    let project = key.project.name;
    let section = key.section?.name;

    if (section === undefined) {
      return project;
    }

    return `${project} / ${section}`;
  };

  let sections = partitionBy<string>(tasks, (task: Task) => {
    let key: SectionPartitionKey = { project: task.project, section: task.section };
    return JSON.stringify(key);
  });
  let groups = Array.from(sections.entries());
  groups.sort((a, b) => {
    let aKey: SectionPartitionKey = JSON.parse(a[0]);
    let bKey: SectionPartitionKey = JSON.parse(b[0]);

    // First compare by project
    let projectOrderDiff = aKey.project.order - bKey.project.order;
    if (projectOrderDiff !== 0) {
      return projectOrderDiff;
    }

    // Now lets compare by sections
    if (aKey.section === undefined && bKey.section === undefined) {
      return 0;
    }

    if (aKey.section === undefined) {
      return -1;
    }

    if (bKey.section === undefined) {
      return 1;
    }

    return aKey.section.order - bKey.section.order;
  });

  return groups.map(([key, tasks]) => {
    return {
      header: makeHeader(JSON.parse(key)),
      tasks,
    };
  });
}

function groupByDate(tasks: Task[]): GroupedTasks[] {
  let i18n = t().query.groupedHeaders;
  let makeHeader = (date: string | undefined): string => {
    if (date === undefined) {
      return i18n.noDueDate;
    }

    if (date === "Overdue") {
      return i18n.overdue;
    }

    return formatAsHeader(new DueDate({ isRecurring: false, date }));
  };

  let dates = partitionBy(tasks, (task: Task) => {
    if (task.due?.date === undefined) {
      return undefined;
    }

    if (new DueDate(task.due).isOverdue()) {
      return "Overdue";
    }

    return task.due.date;
  });
  let groups = Array.from(dates.entries());
  groups.sort((a, b) => {
    let aDate = a[0];
    let bDate = b[0];

    if (aDate === undefined && bDate === undefined) {
      return 0;
    }

    if (aDate === undefined) {
      return 1;
    }

    if (bDate === undefined) {
      return -1;
    }

    if (aDate === "Overdue" && bDate === "Overdue") {
      return 0;
    }

    if (aDate === "Overdue") {
      return -1;
    }

    if (bDate === "Overdue") {
      return 1;
    }

    return aDate.localeCompare(bDate);
  });
  return groups.map(([date, tasks]) => {
    return {
      header: makeHeader(date),
      tasks,
    };
  });
}

function groupByLabel(tasks: Task[]): GroupedTasks[] {
  let labels = partitionByMany(tasks, (task: Task) => task.labels);
  let groups = Array.from(labels.entries());
  groups.sort((a, b) => {
    let aLabel = a[0];
    let bLabel = b[0];

    if (aLabel === undefined && bLabel === undefined) {
      return 0;
    }

    if (aLabel === undefined) {
      return 1;
    }

    if (bLabel === undefined) {
      return -1;
    }

    return aLabel.name.localeCompare(bLabel.name);
  });
  return groups.map(([label, tasks]) => {
    return {
      header: label?.name ?? "No label",
      tasks,
    };
  });
}

function partitionBy<T>(tasks: Task[], selector: (task: Task) => T): Map<T, Task[]> {
  let mapped = new Map<T, Task[]>();

  for (let task of tasks) {
    let key = selector(task);

    if (!mapped.has(key)) {
      mapped.set(key, []);
    }

    mapped.get(key)?.push(task);
  }

  return mapped;
}

function partitionByMany<T>(
  tasks: Task[],
  selector: (task: Task) => T[],
): Map<T | undefined, Task[]> {
  let mapped = new Map<T | undefined, Task[]>();

  let insertTask = (key: T | undefined, task: Task) => {
    if (!mapped.has(key)) {
      mapped.set(key, []);
    }

    mapped.get(key)?.push(task);
  };

  for (let task of tasks) {
    let keys = selector(task);

    if (keys.length === 0) {
      insertTask(undefined, task);
    }

    for (let key of keys) {
      insertTask(key, task);
    }
  }

  return mapped;
}
