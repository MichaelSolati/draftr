---
id: grammar
title: Formal Grammar Reference
sidebar_position: 1
---

# Formal Grammar Reference

This page provides the formal EBNF grammar specification for Draftr (`.draftr`).

---

## EBNF Grammar

```ebnf
Spec             ::= ( Entity | Comment | BlankLine )* ;

Entity           ::= ClassDecl
                   | AbstractClassDecl
                   | InterfaceDecl
                   | TypeDecl
                   | TableDecl
                   | ApiRouteDecl
                   | UiComponentDecl
                   | EventDecl
                   | StateDecl ;

ClassDecl        ::= "class" Identifier [ "extends" Identifier ] [ "implements" IdentifierList ] Newline MemberList ;
AbstractClassDecl::= "abstract" "class" Identifier [ "extends" Identifier ] [ "implements" IdentifierList ] Newline MemberList ;
InterfaceDecl    ::= "interface" Identifier [ "extends" Identifier ] Newline InterfaceMemberList ;
TypeDecl         ::= "type" Identifier Newline PropertyList ;
TableDecl        ::= "db" Identifier Newline ColumnList ;
ApiRouteDecl     ::= "api" Path Newline EndpointList ;
UiComponentDecl  ::= "ui" Identifier Newline UiBodyList ;
EventDecl        ::= "event" Identifier [ "(" Type ")" ] [ "->" Target ] Newline ;
StateDecl        ::= "state" Identifier Newline PropertyList ;

Member           ::= Property | Method | Invocation | Binding ;
Property         ::= Indent2 [ Modifier ] Identifier ":" Type Newline ;
Method           ::= Indent2 [ Modifier ] Identifier "(" [ ParamList ] ")" [ ":" Type ] [ "->" Target ] Newline [ InvocationList ] ;
Invocation       ::= Indent3 ( "calls" | "invokes" | "->" ) Target Newline ;
Binding          ::= Indent2 ( "bind" | "binds" ) Identifier Newline ;

Column           ::= Indent2 [ "+" ] Identifier ":" Type [ "pk" ] [ "unique" ] [ "fk" [ "->" Target ] ] Newline ;
Endpoint         ::= Indent2 [ "+" ] HttpVerb Path [ "(" Type ")" ] [ ":" Type ] [ "->" Target ] Newline ;

HttpVerb         ::= "GET" | "POST" | "PUT" | "DELETE" | "PATCH" ;
Modifier         ::= "+" | "-" | "#" | "public" | "private" | "protected" | "readonly" | "override" ;
Target           ::= Identifier [ "." Identifier [ "()" ] ] ;
```
