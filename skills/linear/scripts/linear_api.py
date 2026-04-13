#!/usr/bin/env python3
"""
Linear API wrapper for OpenClaw
"""

import subprocess
import json
from typing import Optional

LINEAR_API = "https://api.linear.app/graphql"
AUTH_TOKEN = "lin_api_64ssmuFiW5KjeTX8pmiG83nFiCma02PSa5R2oL1k"
TEAM_ID = "43e2e0cc-5bbf-401b-8d72-a7f3b58ed9f5"

# State IDs (need to be updated with real IDs)
STATES = {
    "Backlog": "92a1d96d-2b34-448f-b52e-7f3a905d6390",
    "Todo": "8c4211ec-5753-427a-8536-db31e30dca6a",
    "Done": "23467882-e7ff-496e-99d4-928b8083d9d5",
}


def _query(query: str, variables: dict = None) -> dict:
    """Execute GraphQL query"""
    payload = {"query": query}
    if variables:
        payload["variables"] = variables

    result = subprocess.run(
        ["curl", "-s", "-X", "POST", LINEAR_API,
         "-H", f"Authorization: {AUTH_TOKEN}",
         "-H", "Content-Type: application/json",
         "-d", json.dumps(payload)],
        capture_output=True, text=True
    )
    return json.loads(result.stdout)


def _mutation(query: str, variables: dict = None) -> dict:
    """Execute GraphQL mutation"""
    payload = {"query": query}
    if variables:
        payload["variables"] = variables

    result = subprocess.run(
        ["curl", "-s", "-X", "POST", LINEAR_API,
         "-H", f"Authorization: {AUTH_TOKEN}",
         "-H", "Content-Type: application/json",
         "-d", json.dumps(payload)],
        capture_output=True, text=True
    )
    data = json.loads(result.stdout)
    if "errors" in data:
        raise Exception(f"GraphQL Error: {data['errors']}")
    return data.get("data", {})


# ============ Projects ============

def project_list() -> dict:
    """List all projects"""
    query = """
    query {
      projects(first: 100) {
        nodes {
          id
          name
          description
          state
        }
      }
    }
    """
    data = _query(query)
    projects = data.get("data", {}).get("projects", {}).get("nodes", [])
    return {"projects": projects}


def project_create(name: str, description: str = "") -> dict:
    """Create a new project"""
    mutation = """
    mutation projectCreate($name: String!, $teamId: String!) {
      projectCreate(input: { name: $name, teamId: $teamId }) {
        success
        project {
          id
          name
          identifier
        }
      }
    }
    """
    variables = {"name": name, "teamId": TEAM_ID}
    data = _mutation(mutation, variables)
    result = data.get("projectCreate", {})
    if not result.get("success"):
        raise Exception("Failed to create project")
    return result.get("project", {})


def project_get(project_id: str) -> dict:
    """Get project details"""
    query = """
    query project($id: String!) {
      project(id: $id) {
        id
        name
        description
        milestones(first: 20) {
          nodes { id name status }
        }
        issues(first: 50) {
          nodes {
            id
            identifier
            title
            state { id name }
            priority
          }
        }
      }
    }
    """
    variables = {"id": project_id}
    data = _query(query, variables)
    return data.get("data", {}).get("project", {})


# ============ Milestones ============

def milestone_create(project_id: str, name: str) -> dict:
    """Create a milestone"""
    mutation = """
    mutation milestoneCreate($projectId: String!, $name: String!) {
      projectMilestoneCreate(input: { projectId: $projectId, name: $name }) {
        success
        projectMilestone {
          id
          name
          status
        }
      }
    }
    """
    variables = {"projectId": project_id, "name": name}
    data = _mutation(mutation, variables)
    result = data.get("projectMilestoneCreate", {})
    if not result.get("success"):
        raise Exception("Failed to create milestone")
    return result.get("projectMilestone", {})


def milestone_list(project_id: str) -> dict:
    """List milestones in a project"""
    query = """
    query project($id: String!) {
      project(id: $id) {
        milestones(first: 20) {
          nodes { id name status }
        }
      }
    }
    """
    variables = {"id": project_id}
    data = _query(query, variables)
    milestones = data.get("data", {}).get("project", {}).get("milestones", {}).get("nodes", [])
    return {"milestones": milestones}


# ============ Project Updates ============

def project_update_create(project_id: str, body: str, health: str = "onTrack") -> dict:
    """Create a project update (progress/status report)
    
    Args:
        project_id: Linear project ID
        body: Update text (markdown supported)
        health: "onTrack" | "atRisk" | "offTrack"
    """
    mutation = """
    mutation projectUpdateCreate($projectId: String!, $body: String!, $health: ProjectUpdateHealthType) {
      projectUpdateCreate(input: { projectId: $projectId, body: $body, health: $health }) {
        success
        projectUpdate {
          id
          url
          health
        }
      }
    }
    """
    variables = {"projectId": project_id, "body": body, "health": health}
    data = _mutation(mutation, variables)
    result = data.get("projectUpdateCreate", {})
    if not result.get("success"):
        raise Exception("Failed to create project update")
    return result.get("projectUpdate", {})


# ============ Issues ============

def issue_create(project_id: str, title: str, body: str = "", milestone_id: str = None, priority: int = 0) -> dict:
    """Create an issue/task"""
    mutation = """
    mutation issueCreate($projectId: String!, $title: String!, $body: String, $priority: Int) {
      issueCreate(input: {
        projectId: $projectId,
        title: $title,
        body: $body,
        priority: $priority
      }) {
        success
        issue {
          id
          identifier
          title
          state { id name }
        }
      }
    }
    """
    variables = {
        "projectId": project_id,
        "title": title,
        "body": body,
        "priority": priority
    }
    data = _mutation(mutation, variables)
    result = data.get("issueCreate", {})
    if not result.get("success"):
        raise Exception("Failed to create issue")
    return result.get("issue", {})


def issue_update(issue_id: str, state: str = None, state_id: str = None) -> dict:
    """Update issue state
    
    Args:
        issue_id: Issue ID
        state: State name (Backlog, Todo, In Progress, Done, Canceled, Duplicate)
               OR
        state_id: Direct state ID (bypasses name lookup)
    """
    if state and not state_id:
        state_id = STATES.get(state)
        if not state_id:
            raise Exception(f"Unknown state: {state}. Use state_id directly.")

    mutation = """
    mutation issueUpdate($id: String!, $stateId: String!) {
      issueUpdate(id: $id, input: { stateId: $stateId }) {
        success
        issue {
          id
          identifier
          state { id name }
        }
      }
    }
    """
    variables = {"id": issue_id, "stateId": state_id}
    data = _mutation(mutation, variables)
    result = data.get("issueUpdate", {})
    if not result.get("success"):
        raise Exception("Failed to update issue")
    return result.get("issue", {})


def issue_get(issue_id: str) -> dict:
    """Get issue details"""
    query = """
    query issue($id: String!) {
      issue(id: $id) {
        id
        identifier
        title
        body
        state { id name }
        priority
        assignee { id name email }
        createdAt
        updatedAt
      }
    }
    """
    variables = {"id": issue_id}
    data = _query(query, variables)
    return data.get("data", {}).get("issue", {})


def issue_add_comment(issue_id: str, body: str) -> dict:
    """Add a comment to an issue"""
    mutation = """
    mutation commentCreate($issueId: String!, $body: String!) {
      commentCreate(input: { issueId: $issueId, body: $body }) {
        success
        comment {
          id
          body
          createdAt
        }
      }
    }
    """
    variables = {"issueId": issue_id, "body": body}
    data = _mutation(mutation, variables)
    result = data.get("commentCreate", {})
    if not result.get("success"):
        raise Exception("Failed to add comment")
    return result.get("comment", {})


# ============ Attachments ============

def attachment_create(issue_id: str, title: str, url: str, subtitle: str = "") -> dict:
    """Attach a file/link to an issue
    
    Args:
        issue_id: Issue ID
        title: Attachment title (e.g., "ТЗ.md")
        url: URL or path to the file
        subtitle: Optional description
    """
    mutation = """
    mutation attachmentCreate($issueId: String!, $title: String!, $url: String!, $subtitle: String) {
      attachmentCreate(input: {
        issueId: $issueId,
        title: $title,
        url: $url,
        subtitle: $subtitle
      }) {
        success
        attachment {
          id
          title
          url
        }
      }
    }
    """
    variables = {"issueId": issue_id, "title": title, "url": url, "subtitle": subtitle}
    data = _mutation(mutation, variables)
    result = data.get("attachmentCreate", {})
    if not result.get("success"):
        raise Exception("Failed to create attachment")
    return result.get("attachment", {})


# ============ CLI Interface ============

if __name__ == "__main__":
    import sys

    if len(sys.argv) < 2:
        print("Usage: python linear_api.py <command> [args...]")
        print("Commands:")
        print("  project-list")
        print("  project-create <name> [description]")
        print("  project-get <id>")
        print("  milestone-create <project_id> <name>")
        print("  project-update <project_id> <body> [health]")
        print("  issue-create <project_id> <title> [body]")
        print("  issue-update <issue_id> <state>")
        print("  issue-get <id>")
        print("  issue-comment <issue_id> <body>")
        print("  attachment-create <issue_id> <title> <url> [subtitle]")
        sys.exit(1)

    cmd = sys.argv[1]

    try:
        if cmd == "project-list":
            result = project_list()
            print(json.dumps(result, indent=2, ensure_ascii=False))

        elif cmd == "project-create":
            name = sys.argv[2]
            desc = sys.argv[3] if len(sys.argv) > 3 else ""
            result = project_create(name, desc)
            print(json.dumps(result, indent=2, ensure_ascii=False))

        elif cmd == "project-get":
            result = project_get(sys.argv[2])
            print(json.dumps(result, indent=2, ensure_ascii=False))

        elif cmd == "milestone-create":
            result = milestone_create(sys.argv[2], sys.argv[3])
            print(json.dumps(result, indent=2, ensure_ascii=False))

        elif cmd == "milestone-list":
            result = milestone_list(sys.argv[2])
            print(json.dumps(result, indent=2, ensure_ascii=False))

        elif cmd == "project-update":
            project_id = sys.argv[2]
            body = sys.argv[3].replace("\\n", "\n")
            health = sys.argv[4] if len(sys.argv) > 4 else "onTrack"
            result = project_update_create(project_id, body, health)
            print(json.dumps(result, indent=2, ensure_ascii=False))

        elif cmd == "issue-create":
            project_id = sys.argv[2]
            title = sys.argv[3]
            body = sys.argv[4] if len(sys.argv) > 4 else ""
            result = issue_create(project_id, title, body)
            print(json.dumps(result, indent=2, ensure_ascii=False))

        elif cmd == "issue-update":
            issue_id = sys.argv[2]
            state = sys.argv[3]
            result = issue_update(issue_id, state=state)
            print(json.dumps(result, indent=2, ensure_ascii=False))

        elif cmd == "issue-get":
            result = issue_get(sys.argv[2])
            print(json.dumps(result, indent=2, ensure_ascii=False))

        elif cmd == "issue-comment":
            result = issue_add_comment(sys.argv[2], sys.argv[3])
            print(json.dumps(result, indent=2, ensure_ascii=False))

        elif cmd == "attachment-create":
            issue_id = sys.argv[2]
            title = sys.argv[3]
            url = sys.argv[4]
            subtitle = sys.argv[5] if len(sys.argv) > 5 else ""
            result = attachment_create(issue_id, title, url, subtitle)
            print(json.dumps(result, indent=2, ensure_ascii=False))

        else:
            print(f"Unknown command: {cmd}")
            sys.exit(1)

    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)
