def detect_learning_patterns(activity, llm):
    """
    Use LLM reasoning to detect weak and strong areas.
    """

    prompt = f"""
    You are an AI learning mentor.

    Analyze this student activity and detect:

    1. Weak topics
    2. Strong topics
    3. Learning habits
    4. Areas needing revision
    5. Suggested focus areas

    Activity:
    {activity}

    Return structured insights.
    """

    return llm.invoke(prompt).content


def detect_weak_topics(activity, llm):
    """
    Focus only on weak areas.
    """

    prompt = f"""
    From this student activity, identify the TOP weak topics.

    Activity:
    {activity}

    Return only topic names.
    """

    return llm.invoke(prompt).content


def summarize_weekly(activity, llm):
    """
    Long-term learning memory.
    """

    prompt = f"""
    Summarize this student's weekly learning.

    Include:
    - Progress
    - Weak areas
    - Improvements
    - Suggestions
    """

    return llm.invoke(prompt).content