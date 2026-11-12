import { useCallback, useEffect, useState } from "react";
import { getAllCycles, getOpenCycles } from "@/api/manage/cycleApis";
import { CycleDirectory, EMPTY_DIRECTORY, toCycleInfos, toOpenIds } from "./cycleBinding";

/**
 * 取「全部周期」与「当前开放的周期」。
 *
 * 两个请求各自兜底、互不拖累:任何一个失败都只让对应那一半变成 null(未知),
 * 不抛错——知识库页的列表与表单不该因为周期接口挂了就用不了。
 */
export function useCycleDirectory() {
  const [directory, setDirectory] = useState<CycleDirectory>(EMPTY_DIRECTORY);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    const [cycles, openIds] = await Promise.all([
      getAllCycles().then(
        (res: any) => toCycleInfos(res?.data),
        () => null
      ),
      getOpenCycles().then(
        (res: any) => toOpenIds(res?.data),
        () => null
      ),
    ]);
    setDirectory({ cycles, openIds });
    setLoading(false);
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  return { directory, loading, reload };
}
