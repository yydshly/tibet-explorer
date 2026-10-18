import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { overviewHeritagePresentation } from '../data/overviewHeritageEvidence';
import './OverviewHeritageReading.css';

interface Props {
  recordingId: string;
  text: string;
  textProgress: number;
  /** Opening the image or original catalogue is a study action: pause the same
   * narration clock. Closing does not resume or alter the recording position. */
  onInspect: () => void;
}

export default function OverviewHeritageReading({ recordingId, text, textProgress, onInspect }: Props) {
  const presentation = overviewHeritagePresentation(recordingId, text, textProgress);
  const dialog = useRef<HTMLDialogElement>(null);
  const [failedImage, setFailedImage] = useState<string>();
  useEffect(() => { dialog.current?.close(); }, [recordingId, presentation?.object.id]);
  if (!presentation) return null;
  const { object, moment, presence } = presentation;
  const markerStyle = (rectangle: readonly [number, number, number, number]): CSSProperties => ({
    left: `${rectangle[0] * 100}%`, top: `${rectangle[1] * 100}%`,
    width: `${rectangle[2] * 100}%`, height: `${rectangle[3] * 100}%`,
  });
  const photo = (large: boolean) => <div className={`overview-heritage-photo ${large ? 'is-large' : ''}`} style={{ aspectRatio: `${object.width} / ${object.height}` }}>
    {failedImage !== object.id ? <img src={object.image} alt={object.imageAlt} width={object.width} height={object.height} onError={() => setFailedImage(object.id)} />
      : <p>实物图像暂未加载，可打开原馆藏核对。</p>}
    {failedImage !== object.id && moment.rectangles?.map((rectangle, index) => <span key={index} className="overview-heritage-rectangle" style={markerStyle(rectangle)} aria-hidden="true" />)}
  </div>;
  return <>
    <figure className="overview-heritage-reading" style={{ opacity: presence }} data-heritage-presence={presence.toFixed(4)} data-heritage-object={object.id} data-heritage-token={moment.token} aria-label={`与当前讲述对应的实物：${object.title}`}>
      <figcaption><span>实物对读 · 地图保留在旁</span><strong>{object.title}</strong></figcaption>
      <button className="overview-heritage-image-button" onClick={() => { onInspect(); dialog.current?.showModal(); }} aria-label={`暂停并放大${object.title}`}>
        {photo(false)}
      </button>
      <p className="overview-heritage-date">{object.date} · {object.material}</p>
      <p className="overview-heritage-observation">{moment.observation}</p>
      <a href={object.source} target="_blank" rel="noreferrer" onClick={onInspect}>Met原馆藏 · {object.accession} ↗</a>
    </figure>
    <dialog ref={dialog} className="overview-heritage-dialog" aria-label={`${object.title}的实物与资料核对`}>
      <button className="overview-heritage-close" onClick={() => dialog.current?.close()} autoFocus>关闭实物对读 ×</button>
      <div className="overview-heritage-dialog-body">
        {photo(true)}
        <div><p className="overview-heritage-dialog-eyebrow">同一材料，分清事件与物件</p><h2>{object.title}</h2><p>{object.date} · {object.material}</p><strong>{moment.observation}</strong><p>{moment.explanation}</p><h3>这件材料让我们看见什么</h3><p>{object.supports}</p><p className="overview-heritage-limit">{object.limit}</p><small>{object.scope}</small><a href={object.source} target="_blank" rel="noreferrer" onClick={onInspect}>打开Met馆藏原记录 · {object.accession} ↗</a><small>照片：The Metropolitan Museum of Art，Public Domain / CC0。观察框为页面阅读辅助，未改绘实物。</small></div>
      </div>
    </dialog>
  </>;
}
