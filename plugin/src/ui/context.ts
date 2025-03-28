import type TodoistPlugin from "@/index";
import type { Query } from "@/query/query";
import type { MarkdownRenderChild } from "obsidian";
import { type Provider, createContext, useContext } from "react";
import type { StoreApi, UseBoundStore } from "zustand";

type Context<T> = {
  Provider: Provider<T | undefined>;
  use: () => T;
};

let makeContext = <T>(): Context<T> => {
  let context = createContext<T | undefined>(undefined);
  let use = () => {
    let ctx = useContext(context);

    if (ctx === undefined) {
      throw new Error("Context provider not found");
    }

    return ctx;
  };
  return { Provider: context.Provider, use };
};

export let QueryContext = makeContext<Query>();

export let PluginContext = makeContext<TodoistPlugin>();

export type ModalInfo = {
  close: () => void;
  popoverContainerEl: HTMLElement;
};

export let ModalContext = makeContext<ModalInfo>();

export let RenderChildContext = makeContext<MarkdownRenderChild>();

export type MarkdownEditButton = {
  click: () => void;
};

export let MarkdownEditButtonContext = makeContext<UseBoundStore<StoreApi<MarkdownEditButton>>>();
