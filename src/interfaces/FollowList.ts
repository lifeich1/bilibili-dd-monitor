/**
 * 关注列表
 * @deprecated migrate to new followList data structure
 */
export interface FollowList {
  id: number; // 分组id
  name: string; // 分组名称
  mids: number[]; // 一个数组，数组元素为bili用户mid @deprecated use number set
}

interface FollowListItem {
  face: string, //头像
  uname: string, // 昵称
  sign?: string, // 空间描述，可能缺失。
  mid: number,  // 用户UID
  roomid: number, // 直播间id
  info_source: string // 内部字段，表示该followListItem获取的方式，DD_CENTER 或者 BILIBILI，等等。
}

export interface FollowListPlus {
  id: number; // 分组id
  name: string; // 分组名称
  list: FollowListItem[] // 对象数组
}
