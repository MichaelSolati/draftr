export type Visibility = 'public' | 'private' | 'protected';

export type DomainType =
  | 'logic'
  | 'ui'
  | 'database'
  | 'api'
  | 'event'
  | 'state';

export interface MethodParameter {
  name: string;
  type: string;
  isOptional?: boolean;
}

export interface MethodCall {
  targetClass: string;
  targetMethod: string;
  verb?:
    | 'call'
    | 'emit'
    | 'dispatch'
    | 'query'
    | 'mutate'
    | 'render'
    | 'invokes';
  payload?: string;
}

export interface MethodSignature {
  name: string;
  visibility: Visibility;
  parameters: MethodParameter[];
  returnType: string;
  isAsync?: boolean;
  isStatic?: boolean;
  accessor?: 'get' | 'set';
  calls?: MethodCall[];
}

export interface PropertyDefinition {
  name: string;
  visibility: Visibility;
  type: string;
  isOptional?: boolean;
  isStatic?: boolean;
  accessor?: 'get' | 'set';
}

export interface FunctionSpec {
  id: string;
  name: string;
  visibility: Visibility;
  parameters: MethodParameter[];
  returnType: string;
  calls?: MethodCall[];
  position?: {x: number; y: number};
}

export interface ClassSpec {
  id: string;
  name: string;
  kind: 'class' | 'type' | 'interface' | 'abstract';
  superClass?: string;
  interfaces?: string[];
  properties: PropertyDefinition[];
  methods: MethodSignature[];
  position?: {x: number; y: number};
}

export interface UIProp {
  name: string;
  type: string;
  isOptional?: boolean;
}

export interface UIEmit {
  name: string;
  payloadType: string;
}

export interface UIComponentSpec {
  id: string;
  name: string;
  parentId?: string;
  children: string[];
  boundLogicEntities: string[];
  props?: UIProp[];
  emits?: UIEmit[];
  renderedComponents?: string[];
  position?: {x: number; y: number};
}

/* Database / Schema types */
export interface ColumnDefinition {
  name: string;
  type: string;
  isPrimary?: boolean;
  isUnique?: boolean;
  isForeignKey?: boolean;
  isNullable?: boolean;
  isIndexed?: boolean;
  defaultValue?: string;
  references?: {table: string; column: string};
}

export interface TableSpec {
  id: string;
  name: string;
  columns: ColumnDefinition[];
  position?: {x: number; y: number};
}

/* API Route types */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface ApiEndpoint {
  method: HttpMethod;
  name: string;
  requestType?: string;
  responseType?: string;
  targetHandler?: {targetClass: string; targetMethod: string};
}

export interface ApiRouteSpec {
  id: string;
  path: string;
  endpoints: ApiEndpoint[];
  position?: {x: number; y: number};
}

/* Event & State types */
export interface EventSpec {
  id: string;
  name: string;
  payloadType?: string;
  targets: Array<{targetClass: string; targetMethod: string}>;
  position?: {x: number; y: number};
}

export interface StateField {
  name: string;
  type: string;
  modifier?: 'get' | 'set' | 'action';
}

export interface StateSpec {
  id: string;
  name: string;
  fields: StateField[];
  position?: {x: number; y: number};
}

export interface ConnectionEdge {
  id: string;
  sourceId: string;
  sourceMember?: string;
  targetId: string;
  targetMember?: string;
  type:
    | 'invokes'
    | 'binds'
    | 'inherits'
    | 'implements'
    | 'foreignKey'
    | 'emits'
    | 'call'
    | 'emit'
    | 'dispatch'
    | 'query'
    | 'mutate'
    | 'render';
}

export interface ParserDiagnostic {
  line: number;
  message: string;
  severity: 'warning' | 'error' | 'info';
}

export interface ArchitectureProject {
  id: string;
  name: string;
  rawOutlineText: string;
  classes: ClassSpec[];
  uiComponents: UIComponentSpec[];
  tables?: TableSpec[];
  apiRoutes?: ApiRouteSpec[];
  events?: EventSpec[];
  states?: StateSpec[];
  functions?: FunctionSpec[];
  connections: ConnectionEdge[];
  nodePositions?: Record<string, {x: number; y: number}>;
  updatedAt: number;
  createdAt: number;
}
