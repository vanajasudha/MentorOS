from patterns import detect_learning_patterns


def generate_daily_plan(activity, llm):
    insights = detect_learning_patterns(activity, llm)

    prompt = f"""
    You are a personalized AI mentor.

    Based on this learning insight:
    {insights}

    Create today's plan:
    1. Revision
    2. Practice
    3. New learning
    4. Motivation

    Keep it short and actionable.
    """

    return llm.invoke(prompt).content


def generate_learning_roadmap(activity, llm):
    """
    Long-term roadmap.
    """

    insights = detect_learning_patterns(activity, llm)

    prompt = f"""
    Based on this student learning pattern:

    {insights}

    Create a structured roadmap:
    - Beginner to advanced
    - Weekly milestones
    - Key topics
    - Practice strategy
    """

    return llm.invoke(prompt).content