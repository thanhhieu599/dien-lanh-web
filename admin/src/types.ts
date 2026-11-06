export type Row = Record<string, any>;
export interface User {id:string;name:string;role:string;phone?:string;email?:string}
export interface FieldSpec extends Row {key:string;label?:string;type?:string;required?:boolean;col?:string;options?:any;validate?:(value:any,row:Row)=>string|null}
export interface Resource extends Row {title:string;table:string;fields:FieldSpec[];search?:string[];order?:string;adminOnly?:boolean}
export interface Database {mode:'demo'|'mysql';me():Promise<User|null>;login(id:string,password:string):Promise<User|null>;logout():Promise<void>;list(table:string,options?:Row):Promise<{rows:Row[];count:number}>;get(table:string,id:any,select?:string):Promise<Row|null>;insert(table:string,row:Row):Promise<Row>;update(table:string,id:any,row:Row):Promise<Row>;remove(table:string,id:any):Promise<void>;rpc(name:string,args?:Row):Promise<any>;upload?(path:string,file:Blob):Promise<string>;removeFile?(url:string):Promise<void>;setRole?(role:string):void;reset?():void;saveBrand(data:Row,id?:any):Promise<Row>}
export interface Admin extends Row {db:Database;me:User|null;resources:Record<string,Resource>;PK:Record<string,string>;cache:Row}
declare global {interface Window {AD:Admin}}
